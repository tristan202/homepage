import { useTranslation } from "next-i18next/pages";

import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import useWidgetAPI from "utils/proxy/use-widget-api";

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;

  const { data: imapData, error: imapError } = useWidgetAPI(widget, "status");

  if (imapError) {
    return <Container service={service} error={imapError} />;
  }

  if (!imapData) {
    return (
      <Container service={service}>
        <Block label="imap.unread" />
        <Block label="imap.total" />
      </Container>
    );
  }

  return (
    <Container service={service}>
      <Block label="imap.unread" value={t("common.number", { value: imapData.unread })} />
      <Block label="imap.total" value={t("common.number", { value: imapData.total })} />
    </Container>
  );
}
