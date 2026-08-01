import type { SelectionProvider } from "./types";

export class GoogleDocsSelectionProvider implements SelectionProvider {

  async getSelectedText(): Promise<string> {

    console.log("Google Docs provider called.");

    return "";

  }

}