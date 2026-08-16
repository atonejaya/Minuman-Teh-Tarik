export function findOpenGroupForPath(path, config) {
  for (const item of config) {
    if (item.children && item.children.some((child) => path.startsWith(child.to))) {
      return item.key;
    }
  }
  return null;
}
