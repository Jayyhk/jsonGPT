# jsonGPT

A TypeScript function that handles JSON generation from OpenAI's API output, addressing issues `JSON.parse()` might not solve.

## Basic Generation

### Syntax

```typescript
function json_gpt(
  system_prompt: string,
  user_prompt: string | string[],
  output_format: OutputFormat,
  default_category?: string,
  output_value_only?: boolean,
  model?: string,
  temperature?: number,
  num_tries?: number,
  verbose?: boolean
): Promise<any>;
```

- **system_prompt**: A description for the assistant. Example: "You are a \<purpose in life\>".
- **user_prompt**: User input, which can be a string or an array of strings.
- **output_format**: A JSON object defining the expected output format.
  - Keys are output labels, and values describe the expected output.
- **default_category**: (Optional) A fallback category for list outputs.
- **output_value_only**: (Optional) If `true`, the output only includes values, not keys.
- **model**: (Optional) OpenAI model name (default: `"gpt-4o"`).
- **temperature**: (Optional) Sampling temperature for randomness (default: `1`).
- **num_tries**: (Optional) Number of attempts to get a valid JSON response (default: `3`).
- **verbose**: (Optional) If `true`, logs system and user prompts as well as responses.

### Example Usage

```typescript
const res = await json_gpt(
  "You are a classifier",
  "It is a beautiful and sunny day",
  {
    Sentiment: "Type of Sentiment",
    Adjectives: "List of adjectives",
    Words: "Number of words"
  }
);

console.log(res);
```

#### Example Output

```json
{
  "Sentiment": "positive",
  "Adjectives": ["beautiful", "sunny"],
  "Words": 7
}
```

## Advanced Generation

- Demonstrates generating structured outputs like code or multi-format text.

### Example Usage

```typescript
res = json_gpt(system_prompt = 'You are a code generator, generating code to fulfil a task',
                    user_prompt = 'Given array p, output a function named func_sum to return its sum',
                    output_format = {'Elaboration': 'How you would do it',
                                     'C': 'Code',
                                    'Python': 'Code'})
                                    
print(res)
```
#### Example output

```json
{
  "Elaboration": "To calculate the sum of an array, iterate through each element and add it to a running total.",
  "C": "int func_sum(int p[], int size) {\n    int sum = 0;\n    for (int i = 0; i < size; i++) {\n        sum += p[i];\n    }\n    return sum;\n}",
  "Python": "def func_sum(p):\n    sum = 0\n    for num in p:\n        sum += num\n    return sum"
}

## Contribution

Feel free to open an issue if you spot a bug. All contributions are welcome!