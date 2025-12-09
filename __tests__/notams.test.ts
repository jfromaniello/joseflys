/**
 * Tests for NOTAM client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Notam } from "../lib/clients/notams";

// Mock the redis module
vi.mock("@/lib/redis", () => ({
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
  }),
}));

describe("NOTAM Client", () => {
  const originalEnv = process.env.NOTAM_SEARCH_URL;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NOTAM_SEARCH_URL = "https://example.com/notamSearch";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalEnv) {
      process.env.NOTAM_SEARCH_URL = originalEnv;
    } else {
      delete process.env.NOTAM_SEARCH_URL;
    }
  });

  describe("fetchNotams", () => {
    it("should fetch NOTAMs for a valid ICAO code", async () => {
      const mockNotams: Notam[] = [
        {
          facilityDesignator: "JFK",
          notamNumber: "02/117",
          featureName: "Aerodrome",
          issueDate: "02/09/2024 1449",
          startDate: "02/09/2024 1449",
          endDate: "06/30/2026 2300EST",
          source: "DN",
          sourceType: "D",
          icaoMessage: "02/117 NOTAMN",
          traditionalMessage: "!JFK 02/117 JFK APRON TERMINAL 5 RAMP WIP",
          plainLanguageMessage: "Terminal 5 ramp work in progress",
          traditionalMessageFrom4thWord: "APRON TERMINAL 5 RAMP WIP",
          icaoId: "KJFK",
          accountId: "1330",
          airportName: "John F Kennedy Intl",
          procedure: false,
          transactionID: 71371676,
          cancelledOrExpired: false,
          status: "Active",
          keyword: "APRON",
          snowtam: false,
          geometry: "POINT(2167751.50789277 -134564.893591332)",
          mapPointer: "POINT(-73.7789 40.6398)",
        },
      ];

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: { getSetCookie: () => [] },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockNotams),
          headers: { getSetCookie: () => [] },
        });

      const { fetchNotams, resetCookieJar } = await import("../lib/clients/notams");
      resetCookieJar();

      const notams = await fetchNotams("KJFK");

      expect(notams).toHaveLength(1);
      expect(notams[0].icaoId).toBe("KJFK");
      expect(notams[0].notamNumber).toBe("02/117");
      expect(notams[0].status).toBe("Active");
    });

    it("should normalize ICAO code to uppercase", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: { getSetCookie: () => [] },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
          headers: { getSetCookie: () => [] },
        });

      const { fetchNotams, resetCookieJar } = await import("../lib/clients/notams");
      resetCookieJar();

      await fetchNotams("kjfk");

      const searchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(searchCall[1].body).toContain("KJFK");
    });

    it("should return empty array when no NOTAMs found", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: { getSetCookie: () => [] },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
          headers: { getSetCookie: () => [] },
        });

      const { fetchNotams, resetCookieJar } = await import("../lib/clients/notams");
      resetCookieJar();

      const notams = await fetchNotams("XXXX");

      expect(notams).toHaveLength(0);
    });

    it("should throw error when NOTAM_SEARCH_URL is not set", async () => {
      delete process.env.NOTAM_SEARCH_URL;

      const { fetchNotams, resetCookieJar } = await import("../lib/clients/notams");
      resetCookieJar();

      await expect(fetchNotams("KJFK")).rejects.toThrow(
        "NOTAM_SEARCH_URL environment variable is not set"
      );
    });

    it("should throw error on failed API response", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: { getSetCookie: () => [] },
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: { getSetCookie: () => [] },
        });

      const { fetchNotams, resetCookieJar } = await import("../lib/clients/notams");
      resetCookieJar();

      await expect(fetchNotams("KJFK")).rejects.toThrow("NOTAM search failed: 500");
    });

    it("should set fnsDisclaimer cookie", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: { getSetCookie: () => [] },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
          headers: { getSetCookie: () => [] },
        });

      const { fetchNotams, resetCookieJar } = await import("../lib/clients/notams");
      resetCookieJar();

      await fetchNotams("KJFK");

      const searchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(searchCall[1].headers.Cookie).toContain("fnsDisclaimer=agreed");
    });

    it("should preserve cookies from response", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            getSetCookie: () => ["sessionId=abc123; Path=/"],
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
          headers: { getSetCookie: () => [] },
        });

      const { fetchNotams, resetCookieJar } = await import("../lib/clients/notams");
      resetCookieJar();

      await fetchNotams("KJFK");

      const searchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(searchCall[1].headers.Cookie).toContain("sessionId=abc123");
    });

    it("should use correct URL structure", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: { getSetCookie: () => [] },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
          headers: { getSetCookie: () => [] },
        });

      const { fetchNotams, resetCookieJar } = await import("../lib/clients/notams");
      resetCookieJar();

      await fetchNotams("KJFK");

      // Check init call
      const initCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(initCall[0]).toBe("https://example.com/notamSearch/nsapp.html");

      // Check search call
      const searchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(searchCall[0]).toBe("https://example.com/notamSearch/search");
      expect(searchCall[1].method).toBe("POST");
      expect(searchCall[1].headers["Content-Type"]).toBe(
        "application/x-www-form-urlencoded; charset=utf-8"
      );
    });
  });

  describe("resetCookieJar", () => {
    it("should clear cookies and require re-initialization", async () => {
      const { fetchNotams, resetCookieJar } = await import("../lib/clients/notams");

      // First request initializes cookies
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: { getSetCookie: () => ["test=value"] },
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
          headers: { getSetCookie: () => [] },
        });

      resetCookieJar();
      await fetchNotams("KJFK");
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Reset and make another request
      resetCookieJar();
      vi.clearAllMocks();

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: { getSetCookie: () => [] },
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
          headers: { getSetCookie: () => [] },
        });

      await fetchNotams("SACO");

      // Should have made the init request again (2 calls total)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
