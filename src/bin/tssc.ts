import { Command, ParseOptions } from "commander";
import { readFile } from "fs/promises";
import { CompilationOptions, compileFile } from "../index";
import { coerceToString, Option } from "../utils";
import { version } from "typescript";

function changeExtension(inputFile: string): string {
	return `${inputFile.replace(/\\.[^/.]+$/, "")}.js`;
}

export async function main(argv: string[], opts?: ParseOptions) {
	let programName: string;
	switch (opts?.from ?? "node") {
		case "electron":
		case "node":
			programName = argv[1];
			break;
		case "user":
			programName = process.argv0;
	}
	const c = new Command(`${programName} <input>`)
		.storeOptionsAsProperties(false)
		.version(process.version, "-v, --version")
		.helpOption("-h, --help")
		.option("-C, --no-emit", "Only typechecks, doesn't emit")
		.option("-E, --no-check", "Doesn't typecheck, only emits")
		.option("-d, --create-deps", "Creates a Makefile-style dependency file", false)
		.option("-c, --configuration <configPath>", "Path to configuration file", undefined)
		.requiredOption("-o, --output <output>", "Output file", undefined)
		.allowUnknownOption(false)
		.on("--help", () => {
			console.log();
			console.log(`\tusing TypeScript ${version}`);
		})
		.on("--version", () => {
			console.log(`Using TypeScript ${version}`);
		});
	const args = await c.parseAsync(argv, opts);
	const aopts = args.opts();
	const copts: CompilationOptions = {
		basePath: process.cwd(),
		configuration: await new Option(aopts.configuration)
			.toPromise()
			.then(readFile)
			.then(coerceToString)
			.then(JSON.parse)
			.catch(() => {}),
		createDeps: aopts.createDeps,
		inputFile: args.args[0],
		outputFile: aopts.output ?? changeExtension(this.inputFile),
		check: aopts.check,
		emit: aopts.emit,
	};

	const error = await compileFile(copts);
	process.exit(error ? 1 : 0);
}

main(process.argv).catch(console.error.bind(console));
