// A teammate's mark: their initial on a small name tag, like a staff badge on the
// kitchen rota. No faces: the cast is fictional and the tag says only who is talking.
// Byte is not a person, so it gets its own drawn mark, in Byte violet.
import Icon from "./Icon";

type Props = {
  name: string;
  byte?: boolean;
  /** You: the tag is outlined in amber, the colour of your next action. */
  you?: boolean;
  size?: "sm" | "md";
};

export default function NameTag({ name, byte = false, you = false, size = "md" }: Props) {
  const box = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  if (byte) {
    return (
      <span aria-hidden className={`grid shrink-0 place-items-center rounded-md border border-byte/50 text-byte ${box}`}>
        <Icon name="byte" className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      </span>
    );
  }
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-md border font-display font-bold ${box} ${
        you ? "border-signal text-ink" : "border-slate-600 text-slate-200"
      }`}
    >
      {initial}
    </span>
  );
}
