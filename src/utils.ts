export class Option<T> {
	private readonly value: T | null;
	private readonly hasValue: boolean;

	constructor(value?: T | null) {
		this.value = value ?? null;
		this.hasValue = this.value !== null;
	}

	public static flatten<T>(opt: Option<Option<T>>): Option<T> {
		return new Option<T>(opt.asPartial()?.value);
	}

	public static flattenArray<T>(arr: Array<Option<T>>): Array<T> {
		return arr.filter((v) => v.hasValue).map((v) => v.asPartial()!);
	}

	public static fromJSON<T>(value?: T | null): Option<T> {
		return new Option<T>(value);
	}

	public getOrInsert(defaultValue: T): T {
		if (this.hasValue) return this.copyValue();
		else return defaultValue;
	}

	public getOrInsertWith(defaultValueGenerator: () => T): T {
		if (this.hasValue) return this.copyValue();
		else return defaultValueGenerator();
	}

	public asNullable(): T | null {
		if (this.hasValue) return this.copyValue();
		return null;
	}

	public map<U>(cb: (x: T) => U): Option<U> {
		if (this.hasValue) return new Option<U>(cb(this.copyValue()));
		return new Option<U>();
	}

	public filter(pred: (x: T) => boolean): Option<T> {
		if (this.hasValue && pred(this.copyValue())) return this;
		return new Option<T>();
	}

	public then<U>(next: (x: T) => Option<U>): Option<U> {
		if (this.hasValue) return next(this.value);
		return new Option<U>();
	}

	public catch(next: () => Option<T>): Option<T> {
		if (!this.hasValue) return next();
		return this;
	}

	public match<U>({ some, none }: { some: (x: T) => U; none: () => U }): U {
		return this.map(some).asPartial() ?? none();
	}

	public asPartial(): T | undefined {
		if (this.hasValue) return Object.assign({}, this.value);
		return undefined;
	}

	public okOr<L>(or: L): Either<L, T> {
		if (this.hasValue) return Either.Right(this.value!);
		return Either.Left(or);
	}

	public okOrElse<L>(orElse: () => L): Either<L, T> {
		if (this.hasValue) return Either.Right(this.value!);
		return Either.Left(orElse());
	}

	public toPromise(): Promise<T> {
		if (this.hasValue) return Promise.resolve(this.value!);
		return Promise.reject(void 0);
	}

	public toString() {
		return this.hasValue ? `${this.value}` : `<None>`;
	}

	public toJSON() {
		return this.asNullable();
	}

	private copyValue(): T {
		return Object.assign({}, this.value);
	}
}

export class Either<L, R> {
	private readonly _left: L | null;
	private readonly _right: R | null;
	private readonly isLeft: boolean;

	public static Left<L>(value: L): Either<L, never> {
		const c = { _left: value, _right: null, isLeft: true };
		return Object.setPrototypeOf(c, Either);
	}

	public static Right<R>(value: R): Either<never, R> {
		const c = { _left: null, _right: value, isLeft: false };
		return Object.setPrototypeOf(c, Either);
	}

	public static flatten<L, R>(val: Either<L, Either<L, R>>): Either<L, R> {
		if (val.isLeft) return Either.Left(val._left!);
		return val._right!;
	}

	public static flattenArray<L, R>(val: Array<Either<L, R>>): Either<L, Array<R>> {
		const v = val.find((v) => v.isLeft);
		return typeof v === "undefined" ? Either.Right(val.map((v) => v._right!)) : Either.Left(v!._left!);
	}

	public leftAsPartial(): L | undefined {
		if (this.isLeft) return this.copyLeft();
		else return undefined;
	}

	public leftAsNullable(): L | null {
		return this.leftAsPartial() ?? null;
	}

	public left(): Option<L> {
		return new Option<L>(this.leftAsPartial());
	}

	public rightAsPartial(): R | undefined {
		if (this.isLeft) return undefined;
		return this.copyRight();
	}

	public rightAsNullable(): R | null {
		return this.rightAsPartial() ?? null;
	}

	public right(): Option<R> {
		return new Option<R>(this.rightAsPartial());
	}

	public map<U>(cb: (x: R) => U): Either<L, U> {
		if (this.isLeft) return Either.Left(this._left!);
		return Either.Right(cb(this._right!));
	}

	public mapLeft<U>(cb: (x: L) => U): Either<U, R> {
		if (this.isLeft) return Either.Left(cb(this._left!));
		return Either.Right(this._right!);
	}

	public then<U>(next: (x: R) => Either<L, U>): Either<L, U> {
		if (this.isLeft) return Either.Left(this._left!);
		return next(this._right!);
	}

	public catch<U>(next: (x: L) => Either<U, R>): Either<U, R> {
		if (this.isLeft) return next(this._left!);
		return Either.Right(this._right!);
	}

	public toPromise(): Promise<R> {
		if (this.isLeft) return Promise.reject(this._left!);
		return Promise.resolve(this._right!);
	}

	private copyLeft(): L {
		return Object.assign({}, this._left);
	}

	private copyRight(): R {
		return Object.assign({}, this._right);
	}
}

export function coerceToString(x: Buffer | string): string {
	if (x instanceof Buffer) return x.toString();
	return x;
}
