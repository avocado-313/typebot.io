// Flow Builder names generated fields `screen_<screen>_<label>_<index>`.
// Mirrors the parsing the Avocado app uses to show only the `<label>` part;
// any other name is returned untouched.
export const formatFlowFieldName = (name: string): string => {
  const match = name.match(/^screen_\d+_(.+?)_+\d+$/)
  if (!match) return name
  const label = match[1].replace(/_/g, ' ').trim()
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : name
}
