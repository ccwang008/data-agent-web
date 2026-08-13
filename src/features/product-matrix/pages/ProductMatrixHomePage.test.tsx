/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ProductMatrixHomePage from "./ProductMatrixHomePage";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ProductMatrixHomePage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("exposes every Data Stack domain as a direct link", () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProductMatrixHomePage />
        </MemoryRouter>,
      );
    });

    const dataSourceLink = container.querySelector<HTMLAnchorElement>('a[href="/data-source/sources"]');
    const opsLink = container.querySelector<HTMLAnchorElement>('a[href="/ops-monitor/tasks"]');

    expect(dataSourceLink?.textContent).toBe("数据集成");
    expect(opsLink?.textContent).toBe("运维与监控");
  });
});
