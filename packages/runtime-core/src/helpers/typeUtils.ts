//工具类型

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

// make keys required but keep undefined values
// 让keys 是要求被复制的 但是可以为undefined
export type LooseRequired<T> = { [P in string & keyof T]: T[P] }
