import { Field, Tag, Option, Response } from "@formstr/sdk/dist/formstr/nip101";
import FillerStyle from "./formFiller.style";
import FormTitle from "../CreateFormNew/components/FormTitle";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { Button, Form, Spin, Typography } from "antd";
import { ThankYouScreen } from "./ThankYouScreen";
import { SubmitButton } from "./SubmitButton/submit";
import { isMobile } from "../../utils/utility";
import { ReactComponent as CreatedUsingFormstr } from "../../Images/created-using-formstr.svg";
import Markdown from "react-markdown";
import { Event, generateSecretKey, nip19 } from "nostr-tools";
import { FormFields } from "./FormFields";
import { RequestAccess } from "./RequestAccess";
import { fetchFormTemplate } from "@formstr/sdk/dist/formstr/nip101/fetchFormTemplate";
import { useProfileContext } from "../../hooks/useProfileContext";
import { getAllowedUsers, getFormSpec } from "../../utils/formUtils";
import { IFormSettings } from "../CreateFormNew/components/FormSettings/types";
import { AddressPointer } from "nostr-tools/nip19";
import { LoadingOutlined } from "@ant-design/icons";
import { sendNotification } from "../../nostr/common";
import { sendResponses } from "../../nostr/common";
import AIFormFiller from "./AIFormFiller";

const { Text } = Typography;

interface FormFillerProps {
  formSpec?: Tag[];
  embedded?: boolean;
}

export const FormFiller: React.FC<FormFillerProps> = ({
  formSpec,
  embedded,
}) => {
  const { naddr } = useParams();
  const [formTemplate, setFormTemplate] = useState<Tag[] | null>(formSpec || null);
  const isPreview = !!formSpec;
  
  if (!isPreview && !naddr)
    return <Text> Not enough data to render this url </Text>;
    
  let decodedData;
  if (!isPreview) decodedData = nip19.decode(naddr!).data as AddressPointer;
  let pubKey = decodedData?.pubkey;
  let formId = decodedData?.identifier;
  let relays = decodedData?.relays;
  
  const { pubkey: userPubKey, requestPubkey } = useProfileContext();
  const [form] = Form.useForm();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [noAccess, setNoAccess] = useState<boolean>(false);
  const [editKey, setEditKey] = useState<string | undefined | null>();
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [formEvent, setFormEvent] = useState<Event | undefined>();
  const [searchParams] = useSearchParams();
  const hideTitleImage = searchParams.get("hideTitleImage") === "true";
  const viewKeyParams = searchParams.get("viewKey");
  const hideDescription = searchParams.get("hideDescription") === "true";
  const navigate = useNavigate();
  const [isFormReady, setIsFormReady] = useState(isPreview); // Form is immediately ready in preview mode

  // Add debug logging
  useEffect(() => {
    if (isPreview) {
      console.log("Preview mode active with form spec:", formSpec);
      // In preview mode, we already have the template, so form is ready
      setIsFormReady(true);
      // Make sure formTemplate is set from props
      if (formSpec && (!formTemplate || formTemplate !== formSpec)) {
        setFormTemplate(formSpec);
      }
    }
  }, [isPreview, formSpec]);

  useEffect(() => {
    // Clear form fields when formTemplate changes
    if (formTemplate) {
      form.resetFields();
    }
  }, [formTemplate, form]);

  const onKeysFetched = (keys: Tag[] | null) => {
    let editKey = keys?.find((k) => k[0] === "EditAccess")?.[1] || null;
    setEditKey(editKey);
  };

  const initialize = async (
    formAuthor: string,
    formId: string,
    relays?: string[]
  ) => {
    setIsFormReady(false); // Form is loading
    if (!formEvent) {
      try {
        console.log(`Fetching form template for ${formAuthor}:${formId}`);
        const form = await fetchFormTemplate(formAuthor, formId, relays);
        if (!form) {
          console.error("Failed to fetch form template");
          return;
        }
        setFormEvent(form);
        setAllowedUsers(getAllowedUsers(form));
        const formSpec = await getFormSpec(
          form,
          userPubKey,
          onKeysFetched,
          viewKeyParams
        );
        if (!formSpec) {
          console.warn("No access to form");
          setNoAccess(true);
        } else {
          console.log("Form spec loaded successfully:", formSpec);
          setFormTemplate(formSpec);
          setIsFormReady(true); // Form is ready to be displayed
        }
      } catch (error) {
        console.error("Error initializing form:", error);
      }
    }
  };

  useEffect(() => {
    // Skip initialization in preview mode
    if (isPreview) return;
    
    if (pubKey && formId) {
      initialize(pubKey, formId, relays);
    }
  }, [pubKey, formId, relays, userPubKey, viewKeyParams, isPreview]);

  // Cleanup and reset when unmounting
  useEffect(() => {
    return () => {
      form.resetFields();
    };
  }, [form]);

  const handleInput = (
    questionId: string,
    answer: string,
    message?: string
  ) => {
    if (!answer || answer === "") {
      form.setFieldValue(questionId, null);
      return;
    }
    form.setFieldValue(questionId, [answer, message]);
  };

  const handleAIResponsesGenerated = (responses: Record<string, [string, string | undefined]>) => {
    Object.entries(responses).forEach(([fieldId, [answer, message]]) => {
      form.setFieldValue(fieldId, [answer, message]);
    });
  };

  const getResponseRelays = (formEvent: Event) => {
    let formRelays = formEvent.tags
      .filter((r) => r[0] === "relay")
      ?.map((r) => r[1]);
    return Array.from(new Set([...(relays || []), ...(formRelays || [])]));
  };

  const onSubmit = async () => {
    let formResponses = form.getFieldsValue(true);
    const responses: Response[] = Object.keys(formResponses).map(
      (fieldId: string) => {
        let answer = null;
        let message = null;
        if (formResponses[fieldId]) [answer, message] = formResponses[fieldId];
        return ["response", fieldId, answer, JSON.stringify({ message })];
      }
    );
    sendNotification(formTemplate!, responses);
    setFormSubmitted(true);
  };

  const renderSubmitButton = (settings: IFormSettings) => {
    if (isPreview) return null;
    if (!formEvent) return null;
    if (allowedUsers.length === 0) {
      return (
        <SubmitButton
          selfSign={settings.disallowAnonymous}
          edit={false}
          onSubmit={onSubmit}
          form={form}
          relays={getResponseRelays(formEvent)}
          formEvent={formEvent}
        />
      );
    } else if (!userPubKey) {
      return <Button onClick={requestPubkey}>Login to fill this form</Button>;
    } else if (userPubKey && !allowedUsers.includes(userPubKey)) {
      return <RequestAccess pubkey={pubKey!} formId={formId!} />;
    } else {
      return (
        <SubmitButton
          selfSign={true}
          edit={false}
          onSubmit={onSubmit}
          form={form}
          relays={getResponseRelays(formEvent)}
          formEvent={formEvent}
        />
      );
    }
  };

  if ((!pubKey || !formId) && !isPreview) {
    return <Text>INVALID FORM URL</Text>;
  }
  
  if (!isFormReady && !isPreview) {
    return (
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            textAlign: "center",
            display: "block",
          }}
        >
          <Spin
            indicator={
              <LoadingOutlined
                style={{ fontSize: 48, color: "#F7931A" }}
                spin
              />
            }
          />
        </Text>
      </div>
    );
  }
  
  let name: string, settings: IFormSettings, fields: Field[];
  if (formTemplate) {
    try {
      name = formTemplate.find((tag) => tag[0] === "name")?.[1] || "";
      settings = JSON.parse(
        formTemplate.find((tag) => tag[0] === "settings")?.[1] || "{}"
      ) as IFormSettings;
      fields = formTemplate.filter((tag) => tag[0] === "field") as Field[];

      console.log(`Rendering form with ${fields.length} fields, isPreview=${isPreview}`);
      
      return (
        <FillerStyle $isPreview={isPreview}>
          <div className="filler-container">
            <div className="form-filler">
              {!hideTitleImage && (
                <FormTitle
                  className="form-title"
                  edit={false}
                  imageUrl={settings?.titleImageUrl}
                  formTitle={name}
                />
              )}
              {!hideDescription && settings?.description && (
                <div className="form-description">
                  <Text>
                    <Markdown>{settings?.description}</Markdown>
                  </Text>
                </div>
              )}

              <Form
                form={form}
                onFinish={() => {}}
                className={
                  hideDescription ? "hidden-description" : "with-description"
                }
              >
                <div>
                  {fields && fields.length > 0 ? (
                    <FormFields
                      fields={fields}
                      handleInput={handleInput}
                      form={form}
                      embedMode={embedded}
                      disabled={false} // Allow form fields to be interactive in preview
                    />
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                      <Text type="secondary">No form fields found to display</Text>
                    </div>
                  )}
                  <>{renderSubmitButton(settings)}</>
                </div>
              </Form>

              {!isPreview && fields && fields.length > 0 && (
                <AIFormFiller
                  fields={fields}
                  onResponsesGenerated={handleAIResponsesGenerated}
                />
              )}
            </div>
            <div className="branding-container">
              <Link to="/">
                <CreatedUsingFormstr />
              </Link>
              {!isMobile() && (
                <a
                  href="https://github.com/abhay-raizada/nostr-forms"
                  className="foss-link"
                >
                  <Text className="text-style">
                    Formstr is free and Open Source
                  </Text>
                </a>
              )}
            </div>
          </div>
          {embedded ? (
            formSubmitted && (
              <div className="embed-submitted">
                <Text>Response Submitted</Text>
              </div>
            )
          ) : (
            <ThankYouScreen
              isOpen={formSubmitted}
              onClose={() => {
                let navigationUrl = editKey ? `/r/${pubKey}/${formId}` : `/`;
                navigate(navigationUrl);
              }}
            />
          )}
        </FillerStyle>
      );
    } catch (error) {
      console.error("Error rendering form:", error);
      return <Text>Error rendering form: {String(error)}</Text>;
    }
  }
  return <Text>No form template available</Text>;
};
