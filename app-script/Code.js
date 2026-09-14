const REFLECTION_API_URL =
  "https://backend.reflection-app.workers.dev/review";

const MAX_TEXT_LENGTH = 20000;

function onOpen() {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem("Open Reflection", "showReflectionSidebar")
    .addToUi();
}

function onInstall() {
  onOpen();
}

function showReflectionSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Reflection");

  DocumentApp.getUi().showSidebar(html);
}

function getSidebarState() {
  return {
    opportunity:
      PropertiesService.getUserProperties().getProperty(
        getOpportunityPropertyKey_(),
      ) || "",
  };
}

function saveOpportunity(opportunity) {
  PropertiesService.getUserProperties().setProperty(
    getOpportunityPropertyKey_(),
    String(opportunity || "").trim(),
  );

  return { success: true };
}

function reviewFullDocument(opportunity) {
  const documentText = getActiveDocumentBody_().getText().trim();

  if (!documentText) {
    throw new Error("This Google Doc does not contain text to review.");
  }

  return requestReview_(opportunity, documentText, "full document");
}

function reviewHighlightedText(opportunity) {
  const selectedText = getHighlightedText_();

  return requestReview_(opportunity, selectedText, "highlighted text");
}

function implementImprovedText(originalText, revisedText) {
  const cleanOriginalText = normalizeText_(originalText);
  const cleanRevisedText = String(revisedText || "").trim();

  if (!cleanOriginalText) {
    throw new Error("There is no reviewed text to replace.");
  }

  if (!cleanRevisedText) {
    throw new Error("The suggested rewrite cannot be empty.");
  }

  const selection = DocumentApp.getActiveDocument().getSelection();

  if (!selection) {
    throw new Error(
      "Keep the reviewed text selected in Google Docs before implementing changes.",
    );
  }

  if (!isPlainTextSelection_(selection)) {
    throw new Error(
      "Reflection can currently replace normal paragraph text only. Do not select tables, lists, or images.",
    );
  }

  const currentSelectedText = normalizeText_(getHighlightedText_());

  if (currentSelectedText !== cleanOriginalText) {
    throw new Error(
      "The current selection no longer matches the text that was reviewed. Re-select the original reviewed text and try again.",
    );
  }

  const body = getActiveDocumentBody_();
  const bodyText = body.getText();
  const firstMatchIndex = bodyText.indexOf(cleanOriginalText);
  const lastMatchIndex = bodyText.lastIndexOf(cleanOriginalText);

  if (firstMatchIndex === -1) {
    throw new Error(
      "Reflection could not locate the reviewed text in this document. Review it again before implementing changes.",
    );
  }

  if (firstMatchIndex !== lastMatchIndex) {
    throw new Error(
      "This exact text appears more than once in the document. Select a more specific passage and review it again.",
    );
  }

  const editableBodyText = body.editAsText();
  const originalStyle = editableBodyText.getAttributes(firstMatchIndex);

  editableBodyText.deleteText(
    firstMatchIndex,
    firstMatchIndex + cleanOriginalText.length - 1,
  );

  editableBodyText.insertText(firstMatchIndex, cleanRevisedText);

  editableBodyText.setAttributes(
    firstMatchIndex,
    firstMatchIndex + cleanRevisedText.length - 1,
    originalStyle,
  );

  return { success: true };
}

function isPlainTextSelection_(selection) {
  const rangeElements = selection.getRangeElements();

  return rangeElements.every(function (rangeElement) {
    let element = rangeElement.getElement();

    while (element) {
      const type = element.getType();

      if (
        type === DocumentApp.ElementType.TABLE ||
        type === DocumentApp.ElementType.TABLE_ROW ||
        type === DocumentApp.ElementType.TABLE_CELL ||
        type === DocumentApp.ElementType.LIST_ITEM ||
        type === DocumentApp.ElementType.INLINE_IMAGE
      ) {
        return false;
      }

      element = element.getParent();
    }

    return true;
  });
}

function getOpportunityPropertyKey_() {
  return (
    "reflection-opportunity:" +
    DocumentApp.getActiveDocument().getId()
  );
}

function getActiveDocumentBody_() {
  const document = DocumentApp.getActiveDocument();

  if (typeof document.getActiveTab === "function") {
    return document.getActiveTab().asDocumentTab().getBody();
  }

  return document.getBody();
}

function getHighlightedText_() {
  const selection = DocumentApp.getActiveDocument().getSelection();

  if (!selection) {
    throw new Error(
      "Select text in the Google Doc first, then click Review highlighted text.",
    );
  }

  const parts = selection
    .getRangeElements()
    .map(getTextFromRangeElement_)
    .filter(function (part) {
      return Boolean(part);
    });

  const selectedText = parts.join("\n").trim();

  if (!selectedText) {
    throw new Error(
      "Reflection could not read text from this selection. Select normal document text and try again.",
    );
  }

  return selectedText;
}

function getTextFromRangeElement_(rangeElement) {
  const element = rangeElement.getElement();

  if (rangeElement.isPartial() && typeof element.getText === "function") {
    const text = element.getText();

    return text.substring(
      rangeElement.getStartOffset(),
      rangeElement.getEndOffsetInclusive() + 1,
    );
  }

  return getElementText_(element);
}

function getElementText_(element) {
  if (typeof element.getText === "function") {
    return element.getText();
  }

  if (typeof element.getNumChildren !== "function") {
    return "";
  }

  const parts = [];

  for (let index = 0; index < element.getNumChildren(); index += 1) {
    const childText = getElementText_(element.getChild(index));

    if (childText) {
      parts.push(childText);
    }
  }

  return parts.join("\n");
}

function normalizeText_(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function requestReview_(opportunity, application, scopeLabel) {
  const cleanOpportunity = String(opportunity || "").trim();
  const cleanApplication = String(application || "").trim();

  if (!cleanOpportunity) {
    throw new Error("Add the opportunity description before requesting a review.");
  }

  if (cleanApplication.length > MAX_TEXT_LENGTH) {
    throw new Error(
      "This text is too long for one review. Select a smaller section and try again.",
    );
  }

  const response = UrlFetchApp.fetch(REFLECTION_API_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      opportunity: cleanOpportunity,
      application: cleanApplication,
    }),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  const body = response.getContentText();

  let data;

  try {
    data = JSON.parse(body);
  } catch (error) {
    console.error("Reflection API returned invalid JSON", body);
    throw new Error(
      "Reflection received an invalid response from the review service.",
    );
  }

  if (statusCode < 200 || statusCode >= 300 || !data.success) {
    console.error("Reflection API request failed", statusCode, body);

    throw new Error(
      data && data.error
        ? data.error
        : "The AI review service is unavailable. Please try again.",
    );
  }

  return {
    scope: scopeLabel,
    reviewedText: cleanApplication,
    review: data.review,
  };
}