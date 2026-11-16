export class BiMap<K, V> {
	private readonly keyToValue = new Map<K, V>();
	private readonly valueToKey = new Map<V, K>();

	set(key: K, value: V): this {
		if (this.keyToValue.has(key)) {
			const oldValue = this.keyToValue.get(key)!;
			this.valueToKey.delete(oldValue);
		}

		if (this.valueToKey.has(value)) {
			const oldKey = this.valueToKey.get(value)!;
			this.keyToValue.delete(oldKey);
		}

		this.keyToValue.set(key, value);
		this.valueToKey.set(value, key);

		return this;
	}

	getValue(key: K): V | undefined {
		return this.keyToValue.get(key);
	}

	getKey(value: V): K | undefined {
		return this.valueToKey.get(value);
	}

	hasKey(key: K): boolean {
		return this.keyToValue.has(key);
	}

	hasValue(value: V): boolean {
		return this.valueToKey.has(value);
	}

	deleteKey(key: K): boolean {
		if (!this.keyToValue.has(key)) return false;

		const value = this.keyToValue.get(key)!;
		this.keyToValue.delete(key);
		this.valueToKey.delete(value);
		return true;
	}

	deleteValue(value: V): boolean {
		if (!this.valueToKey.has(value)) return false;

		const key = this.valueToKey.get(value)!;
		this.valueToKey.delete(value);
		this.keyToValue.delete(key);
		return true;
	}

	clear(): void {
		this.keyToValue.clear();
		this.valueToKey.clear();
	}

	get size(): number {
		return this.keyToValue.size;
	}
}
