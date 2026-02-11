import { useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Minus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter content...",
  minHeight = "200px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync external value changes into the editor (only when value differs)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
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
      icon: Heading2,
      command: "formatBlock",
      value: "h3",
      label: "Heading",
    },
    {
      icon: Heading3,
      command: "formatBlock",
      value: "h4",
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
    {
      icon: Minus,
      command: "insertHorizontalRule",
      label: "Divider",
    },
  ];

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        {toolbarButtons.map(btn => (
          <Tooltip key={btn.command + (btn.value || "")}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onMouseDown={e => {
                  e.preventDefault(); // Prevent losing focus
                  execCommand(btn.command, btn.value);
                }}
              >
                <btn.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{btn.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        className="p-3 text-sm outline-none prose prose-sm max-w-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground"
        style={{ minHeight }}
        data-placeholder={placeholder}
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: value }}
        suppressContentEditableWarning
      />
    </div>
  );
}
