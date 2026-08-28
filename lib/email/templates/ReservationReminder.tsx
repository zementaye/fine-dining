import { Html, Head, Body, Container, Text, Heading } from "@react-email/components";

export function ReservationReminder(props: {
  guestName: string;
  date: string;
  time: string;
  partySize: number;
  label: "24h" | "2h";
}) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "Georgia, serif", backgroundColor: "#f4f0e8" }}>
        <Container style={{ padding: "40px 24px" }}>
          <Text style={{ letterSpacing: 3, textTransform: "uppercase", fontSize: 12, color: "#a8823f" }}>
            Gursha
          </Text>
          <Heading style={{ fontWeight: 400 }}>
            {props.label === "24h" ? "See you tomorrow" : "See you soon"}
          </Heading>
          <Text>Dear {props.guestName},</Text>
          <Text>
            This is a reminder of your reservation on {props.date} at {props.time} for a party of{" "}
            {props.partySize}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReservationReminder;
