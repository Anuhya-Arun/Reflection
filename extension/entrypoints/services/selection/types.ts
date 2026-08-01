export interface SelectionProvider {
  getSelectedText(): Promise<string>;
}