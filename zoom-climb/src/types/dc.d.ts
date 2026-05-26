// dc.js does not ship official TypeScript types as of 4.x. Treat the
// module as ambient `any` — chart constructors are chainable and only
// loosely typed in dc's own JSDoc.
declare module "dc";

// crossfilter2 ships some types via @types but they're often outdated.
// We re-declare what we use to keep call sites legible.
declare module "crossfilter2" {
  type CrossfilterFn<T, V> = (d: T) => V;
  interface Dimension<T, V> {
    filter(value: V | null | ((v: V) => boolean) | [V, V]): Dimension<T, V>;
    filterAll(): Dimension<T, V>;
    group<K = V>(grouper?: (v: V) => K): Group<T, K, number>;
    top(n: number): T[];
    bottom(n: number): T[];
    dispose(): void;
  }
  interface Group<T, K, V> {
    all(): { key: K; value: V }[];
    top(n: number): { key: K; value: V }[];
    size(): number;
    reduceSum(fn: (d: T) => number): Group<T, K, number>;
    reduceCount(): Group<T, K, number>;
    reduce<P>(
      add: (acc: P, d: T) => P,
      remove: (acc: P, d: T) => P,
      initial: () => P
    ): Group<T, K, P>;
    order(fn: (v: V) => number): Group<T, K, V>;
  }
  interface Crossfilter<T> {
    add(rows: T[]): Crossfilter<T>;
    remove(predicate?: (d: T) => boolean): Crossfilter<T>;
    dimension<V>(value: CrossfilterFn<T, V>, isArray?: boolean): Dimension<T, V>;
    groupAll<V>(): Group<T, "all", V> & {
      reduceCount(): { value(): number };
      reduceSum(fn: (d: T) => number): { value(): number };
    };
    size(): number;
    all(): T[];
  }
  function crossfilter<T>(data?: T[]): Crossfilter<T>;
  export default crossfilter;
  export { Crossfilter, Dimension, Group };
}
