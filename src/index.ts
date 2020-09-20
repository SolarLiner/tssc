import { writeFile } from "fs/promises";
import { native as mkdirp } from "mkdirp";
import { dirname, resolve } from "path";
import {
	CompilerOptions,
	createProgram,
	Diagnostic,
	DiagnosticCategory,
	EmitResult,
	flattenDiagnosticMessageText,
	getPreEmitDiagnostics,
	isImportDeclaration,
	SourceFile,
} from "typescript";

export interface CompilationOptions {
	inputFile: string;
	outputFile: string;
	check: boolean;
	emit: boolean;
	createDeps: boolean;
	configuration: CompilerOptions;
	basePath: string;
}

async function writeDeps(outputfile: string, referencedFiles: string[]): Promise<void> {
	const dep = `${outputfile}: ${referencedFiles.join(" ")}`;
	await writeFile(outputfile + ".d", dep);
}

function getImportFiles(sourceFile: SourceFile): string[] {
	return sourceFile.statements
		.filter(isImportDeclaration)
		.map((s) => s.moduleSpecifier.getText(sourceFile).slice(1, -1) + ".js");
}

function categoryToString(s: DiagnosticCategory): string {
	switch (s) {
		case DiagnosticCategory.Suggestion:
			return "suggestion";
		case DiagnosticCategory.Message:
			return "message";
		case DiagnosticCategory.Warning:
			return "warning";
		case DiagnosticCategory.Error:
			return "error";
	}
}

function printDiagnostics(diagnostics: ArrayLike<Diagnostic>): boolean {
	let error = false;
	for (let i = 0; i < diagnostics.length; i++) {
		const d = diagnostics[i];
		if (d.file) {
			const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
			const message = flattenDiagnosticMessageText(d.messageText, "\n");
			console.error(`${d.file.fileName}:${line + 1}:${character + 1}: ${categoryToString(d.category)}: ${message}`);
			error = error || d.category >= DiagnosticCategory.Error;
			// TODO: Print offending source line
		}
	}
	return error;
}

export async function compileFile(options: CompilationOptions): Promise<boolean> {
	const program = createProgram(
		[options.inputFile],
		Object.assign({}, options.configuration, { outDir: dirname(options.outputFile) })
	);
	const sourceFile = program.getSourceFile(options.inputFile);
	const imports = getImportFiles(sourceFile);

	if (options.check) {
		const error = printDiagnostics(getPreEmitDiagnostics(program, sourceFile));
		if (error) return false;
	}

	if (!options.emit) return true;

	await mkdirp(dirname(options.outputFile));
	if (options.createDeps && imports.length > 0) {
		await writeDeps(
			options.outputFile,
			getImportFiles(sourceFile).map((s) => resolve(dirname(options.outputFile), s))
		);
	}

	const res = await new Promise<EmitResult>((resolve, _) => {
		const r = program.emit(sourceFile, (_, data, __, onError) => {
			writeFile(options.outputFile, data)
				.then(() => resolve(r))
				.catch((err) => onError(`${err}`));
		});
	});

	printDiagnostics(res.diagnostics);
	return true;
}
