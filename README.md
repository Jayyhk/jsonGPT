# jsonGPT

A Typescript function that fixes problems `JSON.parse()` cannot solve for OpenAI's v3 and v4 API output.

## How does it work?

- Extract JSON values as a string using a special regex (add delimiters to ```key``` to make ```###key###```) to split keys and values
- By default, uses ```ast.literal_eval``` to best match the string to a literal (e.g. int, string, dict). Set ```literal_eval = False``` when calling ```json_gpt``` to preserve output fields as string
- Ensures that all JSON fields are output by LLM, if not it will feed in error message to LLM to iteratively correct its generation (default: 3 tries)

## Basic Generation

### Syntax

```typescript
function json_gpt(system_prompt, user_prompt output_format) {
  return output
}
```

- **system_prompt**: Write in whatever you want the LLM to become. "You are a \<purpose in life\>".
- **user_prompt**: The user input. Later, when we use it as a function, this is the function input.
- **output_format**: JSON of output variables in a dictionary, with the key as the output key, and the value as the output description.
  - The output keys will be preserved exactly, while GPT will generate content to match the description of the value as best as possible.
- **output**: A String in object literal format. Use `JSON.parse(output)` to convert output to JSON.

### Example Usage

```typescript
res = json_gpt(system_prompt = 'You are a classifier',
                    user_prompt = 'It is a beautiful and sunny day',
                    output_format = {'Sentiment': 'Type of Sentiment',
                                    'Adjectives': 'List of adjectives',
                                    'Words': 'Number of words'})
                                    
print(res)
```

#### Example Output

```{'Sentiment': 'positive', 'Adjectives': ['beautiful', 'sunny'], 'Words': 7}```

## Advanced Generation

- More advanced demonstration involving code that would typically break `JSON.parse()`

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

```{'Elaboration': 'To calculate the sum of an array, we can iterate through each element of the array and add it to a running total.', ```

```'C': 'int func_sum(int p[], int size) {\n    int sum = 0;\n    for (int i = 0; i < size; i++) {\n        sum += p[i];\n    }\n    return sum;\n}', ```

```'Python': 'def func_sum(p):\n    sum = 0\n    for num in p:\n        sum += num\n    return sum'}```