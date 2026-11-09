jest.mock("react-native", () => ({ Platform: { OS: "web" } }));

type FakeWindow = { fbq?: jest.Mock; localStorage: { getItem: jest.Mock; setItem: jest.Mock } };

describe("trackCompleteRegistration", () => {
  let fbq: jest.Mock;
  let store: Map<string, string>;
  let win: FakeWindow;

  beforeEach(() => {
    jest.resetModules();
    store = new Map();
    fbq = jest.fn();
    win = {
      fbq,
      localStorage: {
        getItem: jest.fn((k: string) => store.get(k) ?? null),
        setItem: jest.fn((k: string, v: string) => void store.set(k, v)),
      },
    };
    (globalThis as unknown as { window?: FakeWindow }).window = win;
  });

  afterAll(() => {
    delete (globalThis as unknown as { window?: FakeWindow }).window;
  });

  function load() {
    return require("../metaPixel") as typeof import("../metaPixel");
  }

  it("sends CompleteRegistration once for a new account", () => {
    const { trackCompleteRegistration } = load();
    trackCompleteRegistration("New.User@Example.com");
    trackCompleteRegistration("new.user@example.com ");
    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("track", "CompleteRegistration");
  });

  it("does not resend after a page reload on the same browser", () => {
    load().trackCompleteRegistration("a@b.com");
    jest.resetModules();
    load().trackCompleteRegistration("a@b.com");
    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("sends separately for a different new account", () => {
    const { trackCompleteRegistration } = load();
    trackCompleteRegistration("a@b.com");
    trackCompleteRegistration("c@d.com");
    expect(fbq).toHaveBeenCalledTimes(2);
  });

  it("does not store the email in plain text", () => {
    load().trackCompleteRegistration("private@example.com");
    expect(JSON.stringify([...store])).not.toContain("private@example.com");
  });

  it("does nothing when the pixel is not loaded", () => {
    delete win.fbq;
    expect(() => load().trackCompleteRegistration("a@b.com")).not.toThrow();
    expect(store.size).toBe(0);
  });

  it("still sends exactly once when storage is blocked", () => {
    win.localStorage.getItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    win.localStorage.setItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    const { trackCompleteRegistration } = load();
    trackCompleteRegistration("a@b.com");
    trackCompleteRegistration("a@b.com");
    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("never throws if the pixel itself throws", () => {
    fbq.mockImplementation(() => {
      throw new Error("pixel error");
    });
    expect(() => load().trackCompleteRegistration("a@b.com")).not.toThrow();
  });
});
