declare namespace Papa {
  interface ParseResult<T> {
    data: T[];
    meta: {
      fields?: string[];
    };
  }

  interface ParseError {
    message: string;
  }

  interface ParseConfig<T> {
    header?: boolean;
    skipEmptyLines?: boolean;
    complete?: (result: ParseResult<T>) => void;
    error?: (error: ParseError) => void;
  }
}

declare const Papa: {
  parse<T>(file: File, config: Papa.ParseConfig<T>): void;
};

export default Papa;
