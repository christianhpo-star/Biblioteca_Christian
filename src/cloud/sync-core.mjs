const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keyed = v => Array.isArray(v) && v.every(x => object(x) && x.id != null);

// Three-way merge: preserve remote changes unless this device changed that field.
export function mergeDelta(base, local, remote) {
  if (same(base, local)) return structuredClone(remote);
  if (keyed(base) && keyed(local) && keyed(remote)) {
    const index = a => Object.fromEntries(a.map(x => [String(x.id), x]));
    return Object.values(mergeDelta(index(base), index(local), index(remote)));
  }
  if (object(base) && object(local) && object(remote)) {
    const result = structuredClone(remote);
    for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
      if (!(key in local)) delete result[key];
      else if (!(key in base)) result[key] = structuredClone(local[key]);
      else if (!same(base[key], local[key])) result[key] = mergeDelta(base[key], local[key], remote[key]);
    }
    return result;
  }
  return structuredClone(local);
}

export { same };

export function validateState(value) {
  const maps = ['leituras', 'fichamentos', 'metaOverrides', 'config'];
  const arrays = ['notas', 'citacoes', 'colecoes'];
  if (!object(value) || maps.some(k => !object(value[k])) || arrays.some(k => !Array.isArray(value[k]))) {
    throw new Error('O backup não possui a estrutura de dados da biblioteca.');
  }
  const keys = new Set([...maps, ...arrays]);
  if (Object.keys(value).some(k => !keys.has(k))) throw new Error('O backup contém campos desconhecidos.');
  if (JSON.stringify(value).length > 700000) throw new Error('Os dados excedem o limite de sincronização (700 mil caracteres). Exporte um backup.');
  return value;
}
