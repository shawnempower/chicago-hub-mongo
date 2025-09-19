import { Button } from "@/components/ui/button";

interface MultipleChoiceButtonsProps {
  content: string;
  onOptionSelect: (option: string) => void;
  onOtherSelect: () => void;
}

// Parse multiple choice options from AI response
function parseMultipleChoiceOptions(content: string): string[] | null {
  // Look for patterns like:
  // A) Option 1 B) Option 2 C) Option 3
  // 1) Option 1 2) Option 2 3) Option 3
  // Would you say your focus is: A) Brand awareness B) Lead generation C) Community engagement D) Something else?
  
  const patterns = [
    /([A-Z]\)\s*[^A-Z)]+)/g, // A) Option pattern
    /(\d\)\s*[^0-9)]+)/g,    // 1) Option pattern
  ];

  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches && matches.length >= 2) {
      return matches.map(match => 
        match.replace(/^[A-Z0-9]\)\s*/, '').trim() // Remove letter/number prefix
      ).filter(option => option.length > 0);
    }
  }

  return null;
}

export function MultipleChoiceButtons({ content, onOptionSelect, onOtherSelect }: MultipleChoiceButtonsProps) {
  const options = parseMultipleChoiceOptions(content);
  
  if (!options) {
    return null;
  }

  const hasOtherOption = options.some(option => 
    option.toLowerCase().includes('something else') || 
    option.toLowerCase().includes('other') ||
    option.toLowerCase().includes('different')
  );

  const filteredOptions = options.filter(option => 
    !option.toLowerCase().includes('something else') && 
    !option.toLowerCase().includes('other') &&
    !option.toLowerCase().includes('different')
  );

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {filteredOptions.map((option, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onOptionSelect(option)}
          className="text-left whitespace-normal h-auto py-2 px-3"
        >
          {option}
        </Button>
      ))}
      {hasOtherOption && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOtherSelect}
          className="text-left whitespace-normal h-auto py-2 px-3"
        >
          Something else (type your answer)
        </Button>
      )}
    </div>
  );
}