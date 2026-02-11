import { useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Palette,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const TEXT_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Dark Gray", value: "#4b5563" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Green", value: "#16a34a" },
  { label: "Blue", value: "#2563eb" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter content...",
  minHeight = "200px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);

  // Set initial content on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync only when value changes externally (e.g. form reset)
  useEffect(() => {
    if (
      editorRef.current &&
      value !== lastValueRef.current &&
      editorRef.current.innerHTML !== value
    ) {
      editorRef.current.innerHTML = value;
    }
    lastValueRef.current = value;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
  }, [onChange]);

  const execCommand = useCallback(
    (command: string, value?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      handleInput();
    },
    [handleInput]
  );

  const insertLink = useCallback(() => {
    const url = prompt("Enter URL:");
    if (url) {
      editorRef.current?.focus();
      document.execCommand("createLink", false, url);
      handleInput();
    }
  }, [handleInput]);

  const toolbarButtons = [
    {
      icon: Bold,
      command: "bold",
      label: "Bold",
    },
    {
      icon: Italic,
      command: "italic",
      label: "Italic",
    },
    {
      icon: Underline,
      command: "underline",
      label: "Underline",
    },
    {
      icon: Heading2,
      command: "formatBlock",
      value: "<h2>",
      label: "Heading",
    },
    {
      icon: Heading3,
      command: "formatBlock",
      value: "<h3>",
      label: "Subheading",
    },
    {
      icon: List,
      command: "insertUnorderedList",
      label: "Bullet List",
    },
    {
      icon: ListOrdered,
      command: "insertOrderedList",
      label: "Numbered List",
    },
    { separator: true },
    {
      icon: AlignLeft,
      command: "justifyLeft",
      label: "Align Left",
    },
    {
      icon: AlignCenter,
      command: "justifyCenter",
      label: "Align Center",
    },
    {
      icon: AlignRight,
      command: "justifyRight",
      label: "Align Right",
    },
    { separator: true },
    {
      icon: Minus,
      command: "insertHorizontalRule",
      label: "Divider",
    },
  ];

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
        {toolbarButtons.map((btn, i) => {
          if ("separator" in btn) {
            return (
              <div key={`sep-${i}`} className="w-px h-5 bg-border mx-0.5" />
            );
          }
          return (
            <Tooltip key={btn.command + (btn.value || "")}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onMouseDown={e => {
                    e.preventDefault();
                    execCommand(btn.command!, btn.value);
                  }}
                >
                  <btn.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{btn.label}</TooltipContent>
            </Tooltip>
          );
        })}

        {/* Link button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onMouseDown={e => {
                e.preventDefault();
                insertLink();
              }}
            >
              <Link className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Insert Link</TooltipContent>
        </Tooltip>

        {/* Text Color picker */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Text Color</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-2" side="bottom" align="start">
            <div className="grid grid-cols-4 gap-1">
              {TEXT_COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  className="w-7 h-7 rounded-md border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                  onMouseDown={e => {
                    e.preventDefault();
                    execCommand("foreColor", color.value);
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        className="p-3 text-sm outline-none prose prose-sm max-w-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground"
        style={{ minHeight }}
        data-placeholder={placeholder}
        onInput={handleInput}
        suppressContentEditableWarning
      />
    </div>
  );
}
