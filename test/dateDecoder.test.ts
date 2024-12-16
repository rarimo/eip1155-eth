import { expect } from "chai";
import { ethers } from "hardhat";

import { DateDecoderMock } from "@ethers-v6";

describe("Date Decoder", () => {
  let decoder: DateDecoderMock;

  before(async () => {
    decoder = await ethers.deployContract("DateDecoderMock");
  });

  describe("#isLeapYear", () => {
    it("should return true for leap year 2000", async () => {
      expect(await decoder.isLeapYear(2000)).to.be.true;
      await decoder.isLeapYearGasTrack(2000);
    });

    it("should return true for leap year 2020", async () => {
      expect(await decoder.isLeapYear(2020)).to.be.true;
      await decoder.isLeapYearGasTrack(2020);
    });

    it("should return false for non-leap year 2100", async () => {
      expect(await decoder.isLeapYear(2100)).to.be.false;
      await decoder.isLeapYearGasTrack(2100);
    });

    it("should return false for non-leap year 2021", async () => {
      expect(await decoder.isLeapYear(2021)).to.be.false;
      await decoder.isLeapYearGasTrack(2021);
    });
  });

  describe("#daysInMonth", () => {
    it("should return 31 for January 2023", async () => {
      expect(await decoder.daysInMonth(2023, 1)).to.equal(31);
      await decoder.daysInMonthGasTrack(2023, 1);
    });

    it("should return 28 for February of a non-leap year (2021)", async () => {
      expect(await decoder.daysInMonth(2021, 2)).to.equal(28);
      await decoder.daysInMonthGasTrack(2021, 2);
    });

    it("should return 29 for February of a leap year (2020)", async () => {
      expect(await decoder.daysInMonth(2020, 2)).to.equal(29);
      await decoder.daysInMonthGasTrack(2020, 2);
    });

    it("should return 30 for April (2023)", async () => {
      expect(await decoder.daysInMonth(2023, 4)).to.equal(30);
      await decoder.daysInMonthGasTrack(2023, 4);
    });

    it("should return 31 for December (2023)", async () => {
      expect(await decoder.daysInMonth(2023, 12)).to.equal(31);
      await decoder.daysInMonthGasTrack(2023, 12);
    });
  });

  describe("#daysFrom1970", () => {
    it("should revert if trying to get timestamp before 1970", async () => {
      await expect(decoder.daysFrom1970(1969, 12, 31)).to.be.revertedWith("DD: Year must be 1970 or later");
    });

    it("should return 0 for 1970-01-01", async () => {
      expect(await decoder.daysFrom1970(1970, 1, 1)).to.equal(0);
      await decoder.daysFrom1970GasTrack(1970, 1, 1);
    });

    it("should return 1 for 1970-01-02", async () => {
      expect(await decoder.daysFrom1970(1970, 1, 2)).to.equal(1);
      await decoder.daysFrom1970GasTrack(1970, 1, 2);
    });

    it("should return correct number of days for 2000-01-01", async () => {
      expect(await decoder.daysFrom1970(2000, 1, 1)).to.equal(10957);
      await decoder.daysFrom1970GasTrack(2000, 1, 1);
    });

    it("should return correct number of days for 2020-03-01", async () => {
      expect(await decoder.daysFrom1970(2020, 3, 1)).to.equal(18322);
      await decoder.daysFrom1970GasTrack(2020, 3, 1);
    });
  });

  describe("#decodeDate", () => {
    it("should return 0 for '000000'", async () => {
      const zeroDate = ethers.toBeHex("0x303030303030");

      expect(await decoder.decodeDate(zeroDate)).to.equal(0);
      await decoder.decodeDateGasTrack(zeroDate);
    });

    it("should decode '230101' (0x323330313031) as 2023-01-01", async () => {
      const date20230101 = ethers.toBeHex("0x323330313031");

      expect(await decoder.decodeDate(date20230101)).to.equal(1672531200);
      await decoder.decodeDateGasTrack(date20230101);
    });

    it("should decode '750101' as 1975-01-01", async () => {
      const date19750101 = ethers.toBeHex("0x373530313031");

      expect(await decoder.decodeDate(date19750101)).to.equal(157766400);
      await decoder.decodeDateGasTrack(date19750101);
    });

    it("should revert for invalid input outside '0'-'9'", async () => {
      const invalidDate = ethers.toBeHex("0x2F3030303030");

      await expect(decoder.decodeDate(invalidDate)).to.be.revertedWith("DD: Invalid input");
    });
  });
});
