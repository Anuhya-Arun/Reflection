const REFLECTION_API_BASE_URL =
  "https://backend.reflection-app.workers.dev";
const REFLECTION_REVIEW_URL =
  `${REFLECTION_API_BASE_URL}/review`;
const REFLECTION_USAGE_URL =
  `${REFLECTION_API_BASE_URL}/usage`;

const MAX_TEXT_LENGTH = 20000;
const IMPLEMENTATION_RANGE_NAME = "reflection-reviewed-text";

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
  const authorization = getAuthorizationState_();

  return {
    opportunity:
      PropertiesService.getUserProperties().getProperty(
        getOpportunityPropertyKey_(),
      ) || "",
    authorizationRequired: authorization.required,
    authorizationUrl: authorization.url,
  };
}

function getReviewUsage() {
  requireAuthorization_();

  const response = UrlFetchApp.fetch(REFLECTION_USAGE_URL, {
    method: "get",
    headers: getReflectionHeaders_(),
    muteHttpExceptions: true,
  });

  const data = parseReflectionResponse_(response);

  if (!data.success || !data.usage) {
    throw new Error(
      data.error || "Reflection could not load your review usage.",
    );
  }

  return data.usage;
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
  const document = DocumentApp.getActiveDocument();
  const selection = document.getSelection();

  if (!selection) {
    throw new Error(
      "Select text in the Google Doc first, then click Review highlighted text.",
    );
  }

  const selectedText = getTextFromRange_(selection);
  const implementationTarget = createImplementationTarget_(
    document,
    selection,
  );

  try {
    const response = requestReview_(
      opportunity,
      selectedText,
      "highlighted text",
    );

    saveImplementationTarget_(
      document,
      implementationTarget,
    );

    return response;
  } catch (error) {
    removeImplementationTarget_(
      document,
      implementationTarget,
    );
    throw error;
  }
}

function implementImprovedText(originalText, revisedText) {
  const cleanOriginalText = normalizeText_(originalText);
  const cleanRevisedText = String(revisedText || "").trim();

  if (!cleanOriginalText) {
    throw new Error("There is no reviewed text to replace.");
  }

  if (!cleanRevisedText) {
    throw new Error("The rewrite cannot be empty.");
  }

  const document = DocumentApp.getActiveDocument();
  const implementationTarget = getImplementationTarget_();

  if (!implementationTarget) {
    throw new Error(
      "Review highlighted text before implementing a rewrite.",
    );
  }

  const namedRange = document.getNamedRangeById(
    implementationTarget.namedRangeId,
  );

  if (!namedRange) {
    clearImplementationTarget_(document);

    throw new Error(
      "Reflection could no longer find the reviewed passage. Review it again before applying a rewrite.",
    );
  }

  const targetRange = namedRange.getRange();
  const currentText = normalizeText_(getTextFromRange_(targetRange));

  if (currentText !== cleanOriginalText) {
    throw new Error(
      "The reviewed passage has changed since Reflection analyzed it. Review that passage again before applying this rewrite.",
    );
  }

  replaceRangeText_(targetRange, cleanRevisedText);
  clearImplementationTarget_(document);

  return { success: true };
}

function createImplementationTarget_(document, selection) {
  const namedRange = document.addNamedRange(
    IMPLEMENTATION_RANGE_NAME,
    selection,
  );

  return {
    namedRangeId: namedRange.getId(),
  };
}

function saveImplementationTarget_(document, target) {
  clearImplementationTarget_(document);

  PropertiesService.getUserProperties().setProperty(
    getImplementationTargetPropertyKey_(),
    JSON.stringify(target),
  );
}

function getImplementationTarget_() {
  const value = PropertiesService.getUserProperties().getProperty(
    getImplementationTargetPropertyKey_(),
  );

  if (!value) {
    return null;
  }

  try {
    const target = JSON.parse(value);

    if (!target.namedRangeId) {
      return null;
    }

    return target;
  } catch (error) {
    return null;
  }
}

function clearImplementationTarget_(document) {
  const target = getImplementationTarget_();

  if (target) {
    removeImplementationTarget_(document, target);
  }

  PropertiesService.getUserProperties().deleteProperty(
    getImplementationTargetPropertyKey_(),
  );
}

function removeImplementationTarget_(document, target) {
  const namedRange = document.getNamedRangeById(
    target.namedRangeId,
  );

  if (namedRange) {
    namedRange.remove();
  }
}

function replaceRangeText_(range, revisedText) {
  const textSegments = getTextSegmentsFromRangeElements_(
    range.getRangeElements(),
  );

  if (!textSegments.length) {
    throw new Error(
      "Reflection could not identify editable text in the reviewed passage.",
    );
  }

  const firstSegment = textSegments[0];
  const originalStyle = firstSegment.text.getAttributes(
    firstSegment.startOffset,
  );

  for (
    let index = textSegments.length - 1;
    index >= 0;
    index -= 1
  ) {
    const segment = textSegments[index];

    segment.text.deleteText(
      segment.startOffset,
      segment.endOffsetInclusive,
    );
  }

  firstSegment.text.insertText(
    firstSegment.startOffset,
    revisedText,
  );

  firstSegment.text.setAttributes(
    firstSegment.startOffset,
    firstSegment.startOffset + revisedText.length - 1,
    originalStyle,
  );
}

function getTextSegmentsFromRangeElements_(rangeElements) {
  const segments = [];
  const segmentByText = new Map();

  rangeElements.forEach(function (rangeElement) {
    const element = rangeElement.getElement();

    if (element.getType() === DocumentApp.ElementType.TEXT) {
      const text = element.asText();
      const textLength = text.getText().length;

      if (!textLength) {
        return;
      }

      addTextSegment_(
        segments,
        segmentByText,
        text,
        rangeElement.isPartial()
          ? rangeElement.getStartOffset()
          : 0,
        rangeElement.isPartial()
          ? rangeElement.getEndOffsetInclusive()
          : textLength - 1,
      );

      return;
    }

    getDescendantTextSegments_(
      element,
      segments,
      segmentByText,
    );
  });

  return segments;
}

function getDescendantTextSegments_(
  element,
  segments,
  segmentByText,
) {
  if (element.getType() === DocumentApp.ElementType.TEXT) {
    const text = element.asText();
    const textLength = text.getText().length;

    if (textLength) {
      addTextSegment_(
        segments,
        segmentByText,
        text,
        0,
        textLength - 1,
      );
    }

    return;
  }

  if (typeof element.getNumChildren !== "function") {
    return;
  }

  for (let index = 0; index < element.getNumChildren(); index += 1) {
    getDescendantTextSegments_(
      element.getChild(index),
      segments,
      segmentByText,
    );
  }
}

function addTextSegment_(
  segments,
  segmentByText,
  text,
  startOffset,
  endOffsetInclusive,
) {
  if (
    startOffset < 0 ||
    endOffsetInclusive < startOffset
  ) {
    return;
  }

  const existingSegment = segmentByText.get(text);

  if (existingSegment) {
    existingSegment.startOffset = Math.min(
      existingSegment.startOffset,
      startOffset,
    );
    existingSegment.endOffsetInclusive = Math.max(
      existingSegment.endOffsetInclusive,
      endOffsetInclusive,
    );

    return;
  }

  const segment = {
    text,
    startOffset,
    endOffsetInclusive,
  };

  segmentByText.set(text, segment);
  segments.push(segment);
}

function getAuthorizationState_() {
  const authorization = ScriptApp.getAuthorizationInfo(
    ScriptApp.AuthMode.FULL,
  );

  const required =
    authorization.getAuthorizationStatus() ===
    ScriptApp.AuthorizationStatus.REQUIRED;

  return {
    required,
    url: required ? authorization.getAuthorizationUrl() : "",
  };
}

function requireAuthorization_() {
  const authorization = getAuthorizationState_();

  if (authorization.required) {
    throw new Error(
      "Reflection needs permission to identify your Google account. Click Authorize Reflection in the sidebar, approve Google’s prompt, then try again.",
    );
  }
}

function getReflectionHeaders_() {
  return {
    Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
  };
}

function getOpportunityPropertyKey_() {
  return `reflection-opportunity:${DocumentApp.getActiveDocument().getId()}`;
}

function getImplementationTargetPropertyKey_() {
  return `reflection-implementation-target:${DocumentApp.getActiveDocument().getId()}`;
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

  return getTextFromRange_(selection);
}

function getTextFromRange_(range) {
  const parts = range
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
  requireAuthorization_();

  const cleanOpportunity = String(opportunity || "").trim();
  const cleanApplication = String(application || "").trim();

  if (!cleanOpportunity) {
    throw new Error("Add an opportunity description before requesting a review.");
  }

  if (cleanApplication.length > MAX_TEXT_LENGTH) {
    throw new Error(
      "This text is too long for one review. Select a smaller section and try again.",
    );
  }

  const response = UrlFetchApp.fetch(REFLECTION_REVIEW_URL, {
    method: "post",
    contentType: "application/json",
    headers: getReflectionHeaders_(),
    payload: JSON.stringify({
      opportunity: cleanOpportunity,
      application: cleanApplication,
    }),
    muteHttpExceptions: true,
  });

  const data = parseReflectionResponse_(response);

  if (!data.success) {
    throw new Error(
      data.error || "The AI review service is unavailable. Please try again.",
    );
  }

  return {
    scope: scopeLabel,
    reviewedText: cleanApplication,
    review: data.review,
    usage: data.usage,
  };
}

function parseReflectionResponse_(response) {
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

  if (statusCode < 200 || statusCode >= 300) {
    console.error("Reflection API request failed", statusCode, body);
  }

  return data;
}