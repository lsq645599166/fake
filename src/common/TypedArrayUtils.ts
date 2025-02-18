export type TypedArray = Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray
  | Int8Array | Int16Array | Int32Array
  | Float32Array | Float64Array;

export function fill<T extends TypedArray>(array: T, value: number, start?: number, end?: number): T {
  // all modern engines that support .fill
  if (array.fill) {
    return array.fill(value, start, end) as T;
  }

  return fillFallback(array, value, start, end);
}

export function fillFallback<T extends TypedArray>(
  array: T,
  value: number,
  start: number = 0,
  end: number = array.length,
): T {
  // safari and IE 11
  // since IE 11 does not support Array.prototype.fill either
  // we cannot use the suggested polyfill from MDN
  // instead we simply fall back to looping
  if (start >= array.length) {
    return array;
  }
  const newStart = (array.length + start) % array.length;
  let newEnd;
  if (end >= array.length) {
    newEnd = array.length;
  } else {
    newEnd = (array.length + end) % array.length;
  }
  for (let i = newStart; i < newEnd; i += 1) {
    array[i] = value;
  }

  return array;
}
