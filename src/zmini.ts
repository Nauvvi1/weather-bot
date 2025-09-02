type Issue = { path: (string|number)[], message: string };
type Result<T> = { success: true; data: T } | { success: false; error: { issues: Issue[] } };

class ZString {
  min(n: number) { 
    return { parse: (v: unknown): string => { 
      if (typeof v !== 'string' || v.length < n) throw new Error(`Expected string min ${n}`); 
      return v; 
    }};
  }
}
class ZEnum<T extends readonly string[]> {
  constructor(private values: T) {}
  parse(v: unknown): T[number] {
    if (typeof v !== "string" || !this.values.includes(v)) throw new Error("Invalid enum value");
    return v as T[number];
  }
}
class ZObject<T extends Record<string, any>> {
  constructor(private shape: T) {}
  safeParse(v: any): Result<any> {
    const issues: Issue[] = [];
    for (const k of Object.keys(this.shape)) {
      const parser = this.shape[k];
      try { 
        parser.parse(v[k]);
      } catch (e: any) {
        issues.push({ path: [k], message: e?.message || "invalid"});
      }
    }
    return issues.length ? { success: false, error: { issues } } : { success: true, data: v };
  }
}

export const z = {
  string: () => new ZString(),
  enum: <T extends readonly string[]>(values: T) => new ZEnum(values),
  object: <T extends Record<string, any>>(shape: T) => new ZObject(shape),
};