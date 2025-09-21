import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "OPENAI_API_KEY",
});

interface OutputFormat {
  [key: string]: string | string[] | OutputFormat;
}

export async function json_gpt(
  system_prompt: string,
  user_prompt: string | string[],
  output_format: OutputFormat,
  default_category: string = "",
  output_value_only: boolean = false,
  model: string = "gpt-4o",
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
      // Use OpenAI to get a response
      const response = await openai.chat.completions.create({
        model,
        temperature,
        messages: [
          {
            role: "system",
            content: system_prompt + output_format_prompt + error_msg,
          },
          {
            role: "user",
            content: Array.isArray(user_prompt)
              ? user_prompt.join("\n")
              : user_prompt,
          },
        ],
      });

      let res: string =
        response.choices[0].message?.content?.replace(/'/g, '"') ?? "";

      // ensure that we don't replace away apostrophes in text
      res = res.replace(/(\w)"(\w)/g, "$1'$2");

      if (verbose) {
        console.log(
          "System prompt:",
          system_prompt + output_format_prompt + error_msg
        );
        console.log("\nUser prompt:", user_prompt);
        console.log("\nGPT response:", res);
      }

      // try-catch block to ensure output format is adhered to
      const output: any = JSON.parse(res);

      if (list_input && !Array.isArray(output)) {
        throw new Error("Output format not in an array of JSON");
      }

      const processedOutput = Array.isArray(output) ? output : [output];
      for (let j = 0; j < processedOutput.length; j++) {
        const obj = processedOutput[j];
        for (const key in output_format) {
          // unable to ensure accuracy of dynamic output header, so skip it
          if (/<.*?>/.test(key)) continue;

          // if output field missing, raise an error
          if (!(key in obj)) {
            throw new Error(`${key} not in JSON output`);
          }

          // check that one of the choices given for the list of words is an unknown
          if (Array.isArray(output_format[key])) {
            const choices = output_format[key] as string[];
            // ensure output is not a list
            if (Array.isArray(obj[key])) {
              obj[key] = obj[key][0];
            }
            // output the default category (if any) if GPT is unable to identify the category
            if (!choices.includes(obj[key]) && default_category) {
              obj[key] = default_category;
            }
            // if the output is a description format, get only the label
            if (typeof obj[key] === "string" && obj[key].includes(":")) {
              obj[key] = obj[key].split(":")[0];
            }
          }
        }

        // if we just want the values for the outputs
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
