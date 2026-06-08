// @vitest-environment happy-dom
/**
 * Unit tests for the StatsCard component.
 * Runs in a DOM environment (happy-dom) to support React rendering.
 */
import { describe, it, expect } from "vitest";
import { render, screen }        from "@testing-library/react";
import "@testing-library/jest-dom";
import { StatsCard } from "~/components/StatsCard";

const DummyIcon = () => <svg data-testid="icon" />;

describe("StatsCard Component", () => {
  describe("content rendering", () => {
    it("renders the title", () => {
      render(<StatsCard title="Total Students" value={42} icon={<DummyIcon />} />);
      expect(screen.getByText("Total Students")).toBeInTheDocument();
    });

    it("renders a numeric value", () => {
      render(<StatsCard title="Title" value={99} icon={<DummyIcon />} />);
      expect(screen.getByText("99")).toBeInTheDocument();
    });

    it("renders a string value", () => {
      render(<StatsCard title="Title" value="Active" icon={<DummyIcon />} />);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders the icon slot", () => {
      render(<StatsCard title="Title" value={0} icon={<DummyIcon />} />);
      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });

    it("renders the optional subtitle when provided", () => {
      render(
        <StatsCard
          title="Verified Students"
          value={12}
          subtitle="Fully certified"
          icon={<DummyIcon />}
        />,
      );
      expect(screen.getByText("Fully certified")).toBeInTheDocument();
    });

    it("does NOT render a subtitle element when omitted", () => {
      render(<StatsCard title="Title" value={0} icon={<DummyIcon />} />);
      expect(screen.queryByText("Fully certified")).not.toBeInTheDocument();
    });
  });

  describe("accent colours", () => {
    const accentCases: Array<[string, string]> = [
      ["indigo", "bg-brand-100 text-brand-700"],
      ["green",  "bg-green-100 text-green-700"],
      ["yellow", "bg-yellow-100 text-yellow-700"],
      ["red",    "bg-red-100 text-red-700"],
      ["blue",   "bg-blue-100 text-blue-700"],
    ];

    for (const [accent, expectedClasses] of accentCases) {
      it(`applies correct icon-wrapper classes for accent="${accent}"`, () => {
        const { container } = render(
          <StatsCard
            title="Test"
            value={1}
            accent={accent as any}
            icon={<DummyIcon />}
          />,
        );
        // The icon wrapper is the w-12 h-12 div (unique within the card)
        const wrapper = container.querySelector(".w-12.h-12");
        expect(wrapper).toBeInTheDocument();
        for (const cls of expectedClasses.split(" ")) {
          expect(wrapper).toHaveClass(cls);
        }
      });
    }

    it("defaults to indigo accent when no accent prop is provided", () => {
      const { container } = render(
        <StatsCard title="Test" value={1} icon={<DummyIcon />} />,
      );
      // Default accent = indigo → icon wrapper has bg-brand-100
      const wrapper = container.querySelector(".w-12.h-12");
      expect(wrapper).toHaveClass("bg-brand-100");
    });
  });

  describe("accessibility", () => {
    it("renders value and title in the correct semantic order (title above value)", () => {
      const { container } = render(
        <StatsCard title="My Metric" value={7} icon={<DummyIcon />} />,
      );
      const textNodes = Array.from(container.querySelectorAll("p")).map(
        (el) => el.textContent,
      );
      const titleIdx = textNodes.findIndex((t) => t?.includes("My Metric"));
      const valueIdx = textNodes.findIndex((t) => t === "7");
      // title <p> appears before value <p>
      expect(titleIdx).toBeLessThan(valueIdx);
    });
  });
});
