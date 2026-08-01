import { GenericSelectionProvider } from "./generic";
import { GoogleDocsSelectionProvider } from "./googleDocs";

export function getSelectionProvider() {

  if (
    location.hostname.includes("docs.google.com")
  ) {
    return new GoogleDocsSelectionProvider();
  }

  return new GenericSelectionProvider();

}