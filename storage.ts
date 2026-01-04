
export type Annotation = {
  id: string;
  url: string;
  exact: string;
  prefix: string;
  suffix: string;
  note: string;
};

export async function loadAnnotations(): Promise<Annotation[]> {
  const result = await chrome.storage.local.get("annotations");
  return Array.isArray(result.annotations)
    ? (result.annotations as Annotation[])
    : [];
}

export async function saveAnnotation(
  exact: string,
  prefix: string,
  suffix: string,
  note: string
): Promise<void> {
  const annotation: Annotation = {
    id: crypto.randomUUID(),
    url: location.href,
    exact,
    prefix,
    suffix,
    note,
  };

  const annotations = await loadAnnotations();
  annotations.push(annotation);
  await chrome.storage.local.set({ annotations });
}

export async function deleteAnnotation(id: string): Promise<void> {
  const annotations = await loadAnnotations();
  const filtered = annotations.filter(a => a.id !== id);
  await chrome.storage.local.set({ annotations: filtered });
}
