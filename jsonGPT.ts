import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OutputFormat {
  [key: string]: string | string[] | OutputFormat;
}

function convertToJsonSchema(obj: OutputFormat): any {
  const schema: any = {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  };
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "string") {
      if (value === "string") {
        schema.properties[key] = { type: "string" };
      } else if (value === "number") {
        schema.properties[key] = { type: "number" };
      } else if (value === "boolean") {
        schema.properties[key] = { type: "boolean" };
      } else {
        schema.properties[key] = { type: "string" };
      }
    } else if (Array.isArray(value)) {
      schema.properties[key] = { type: "string", enum: value };
    } else if (typeof value === "object") {
      schema.properties[key] = convertToJsonSchema(value);
    }
    schema.required.push(key);
  }
  return schema;
}

export async function json_gpt(
  system_prompt: string,
  user_prompt: string | string[],
  output_format: OutputFormat,
  default_category: string = "",
  output_value_only: boolean = false,
  model: string = "gpt-5-mini",
  temperature: number = 1,
  num_tries: number = 3,
  verbose: boolean = false
) {
  // if the user input is in a list, we also process the output as a list of json
  const list_input: boolean = Array.isArray(user_prompt);
  // if the output format contains dynamic elements of < or >, then add to the prompt to handle dynamic elements
  const dynamic_elements: boolean = /<.*?>/.test(JSON.stringify(output_format));
  // if the output format contains list elements of [ or ], then we add to the prompt to handle lists
  const list_output: boolean = /\[.*?\]/.test(JSON.stringify(output_format));

  // start off with no error message
  let error_msg: string = "";

  for (let i = 0; i < num_tries; i++) {
    let output_format_prompt = `\nYou are to output ${
      list_output ? "an array of objects in" : ""
    } the following in JSON format: ${JSON.stringify(output_format)}.`;

    if (list_output) {
      output_format_prompt += `\nIf output field is a list, classify output into the best element of the list.`;
    }

    // if output_format contains dynamic elements, process it accordingly
    if (dynamic_elements) {
      output_format_prompt += `\nAny text enclosed by < and > indicates you must generate content to replace it.`;
    }

    // if input is in a list format, ask it to generate json in a list
    if (list_input) {
      output_format_prompt += `\nGenerate an array of JSON, one JSON for each input element.`;
    }

    try {
      // Prepare instructions and input
      const instructions = system_prompt + output_format_prompt + error_msg;
      const inputItems = list_input
        ? (user_prompt as string[]).map((content: string) => ({
            role: "user" as const,
            content,
          }))
        : [{ role: "user" as const, content: user_prompt as string }];

      // Prepare schema
      const baseSchema = convertToJsonSchema(output_format);
      const jsonSchema = list_input
        ? { type: "array", items: baseSchema }
        : baseSchema;

      // Use OpenAI Responses API
      const response = await openai.responses.create({
        model,
        instructions,
        input: inputItems,
        temperature,
        text: {
          format: {
            type: "json_schema",
            name: "json_output",
            strict: true,
            schema: jsonSchema,
          },
        },
      });

      let res: string = response.output_text ?? "";

      if (verbose) {
        console.log("Instructions:", instructions);
        console.log("\nInput:", inputItems);
        console.log("\nGPT response:", res);
      }

      // Parse the JSON output (guaranteed valid by structured outputs)
      const output: any = JSON.parse(res);

      const processedOutput = Array.isArray(output) ? output : [output];
      for (let j = 0; j < processedOutput.length; j++) {
        const obj = processedOutput[j];

        // Process enum fields and apply defaults
        for (const key in output_format) {
          // Skip dynamic elements
          if (/<.*?>/.test(key)) continue;

          // For enum fields, ensure output is not a list and apply defaults
          if (Array.isArray(output_format[key])) {
            const choices = output_format[key] as string[];
            // Ensure output is not a list
            if (Array.isArray(obj[key])) {
              obj[key] = obj[key][0];
            }
            // Apply default category if output not in choices
            if (!choices.includes(obj[key]) && default_category) {
              obj[key] = default_category;
            }
            // Extract label from description format
            if (typeof obj[key] === "string" && obj[key].includes(":")) {
              obj[key] = obj[key].split(":")[0];
            }
          }
        }

        // If we just want the values for the outputs
        if (output_value_only) {
          const values = Object.values(obj);
          processedOutput[j] = values.length === 1 ? values[0] : values;
        }
      }

      return list_input ? processedOutput : processedOutput[0];
    } catch (e) {
      error_msg = `\n\nPrevious attempt failed with error: ${e}`;
      if (verbose) {
        console.error("Error encountered:", e);
      }
    }
  }

  return list_input ? [] : null;
}
