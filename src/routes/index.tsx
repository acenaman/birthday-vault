import { createFileRoute } from "@tanstack/react-router";
import BirthdayApp from "@/components/BirthdayApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Happy Birthday, My World 💖" },
      { name: "description", content: "A romantic, interactive birthday surprise made just for you." },
      { property: "og:title", content: "Happy Birthday, My World 💖" },
      { property: "og:description", content: "A romantic, interactive birthday surprise made just for you." },
    ],
  }),
  component: Index,
});

function Index() {
  return <BirthdayApp />;
}
