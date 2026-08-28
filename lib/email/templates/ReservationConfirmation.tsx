import { Html, Head, Body, Container, Text, Heading, Hr } from "@react-email/components";

export function ReservationConfirmation(props: {
  guestName: string;
  confirmationCode: string;
  date: string;
  time: string;
  partySize: number;
}) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "Georgia, serif", backgroundColor: "#f4f0e8" }}>
        <Container style={{ padding: "40px 24px" }}>
          <Text style={{ letterSpacing: 3, textTransform: "uppercase", fontSize: 12, color: "#a8823f" }}>
            Gursha
          </Text>
          <Heading style={{ fontWeight: 400 }}>Your table is confirmed</Heading>
          <Text>Dear {props.guestName},</Text>
          <Text>
            We look forward to hosting you on {props.date} at {props.time} for a party of{" "}
            {props.partySize}.
          </Text>
          <Text>
            Confirmation code: <strong>{props.confirmationCode}</strong>
          </Text>
          <Hr />
          <Text style={{ fontSize: 12, color: "#666" }}>
            Need to make changes? Use your confirmation code on our website, or call us
            directly at (202) 555-0148.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReservationConfirmation;
