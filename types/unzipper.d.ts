declare module 'unzipper' {
  interface Entry {
    path: string;
    type: string;
    buffer(): Promise<Buffer>;
  }

  interface CentralDirectory {
    files: Entry[];
  }

  const unzipper: {
    Open: {
      buffer(input: Buffer): Promise<CentralDirectory>;
    };
  };

  export default unzipper;
}
