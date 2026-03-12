import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmailFrame } from "@/components/email-frame";
import { buildEmailSrcDoc } from "@/lib/email-viewer";

describe("email viewer", () => {
  it("wraps HTML in a styled srcDoc document", () => {
    const srcDoc = buildEmailSrcDoc("<p>Hello inbox</p>");

    expect(srcDoc).toContain("Hello inbox");
    expect(srcDoc).toContain("<!doctype html>");
  });

  it("renders content inside a sandboxed iframe", () => {
    render(<EmailFrame bodyHtml="<p>Hello</p>" />);

    const frame = screen.getByTitle("Email content");
    expect(frame).toHaveAttribute("sandbox");
    expect(frame).toHaveAttribute("srcdoc");
  });
});
