import type { SelectionProvider } from "./types";

export class GenericSelectionProvider implements SelectionProvider {

  async getSelectedText(): Promise<string> {

    return window.getSelection()?.toString() || "";

  }

}