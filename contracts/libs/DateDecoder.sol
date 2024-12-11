// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library DateDecoder {
    // Number of seconds in one day
    uint256 internal constant SECONDS_PER_DAY = 86400;

    function isLeapYear(uint256 year) internal pure returns (bool) {
        // Year is leap if divisible by 400, or divisible by 4 and not by 100.
        return ((year % 400 == 0) || ((year % 4 == 0) && (year % 100 != 0)));
    }

    function daysInMonth(uint256 year, uint256 month) internal pure returns (uint256) {
        if (
            month == 1 ||
            month == 3 ||
            month == 5 ||
            month == 7 ||
            month == 8 ||
            month == 10 ||
            month == 12
        ) {
            return 31;
        }
        if (month == 4 || month == 6 || month == 9 || month == 11) {
            return 30;
        }
        // February
        return isLeapYear(year) ? 29 : 28;
    }

    function daysFrom1970(
        uint256 year,
        uint256 month,
        uint256 day
    ) internal pure returns (uint256) {
        // Calculate total days from 1970-01-01 to the given date
        // First handle years
        uint256 daysCount = 0;

        if (year >= 1970) {
            for (uint256 y = 1970; y < year; y++) {
                daysCount += isLeapYear(y) ? 366 : 365;
            }
        } else {
            // If needed, handle years before 1970, though "YY" implies no earlier than 1900
            for (uint256 y = year; y < 1970; y++) {
                daysCount -= isLeapYear(y) ? 366 : 365;
            }
        }

        // Add days for months before the given month
        for (uint256 m = 1; m < month; m++) {
            daysCount += daysInMonth(year, m);
        }

        // Add days of current month (day - 1 since we start counting from zero)
        daysCount += (day - 1);

        return daysCount;
    }

    function decodeDate(uint256 encoded) internal pure returns (uint256) {
        require(
            encoded >= 0x303030303030 && encoded <= 0x393939393939,
            "DateDecoder: Invalid input"
        );

        // Convert the uint256 into a 6-byte ASCII sequence
        // The encoding produces 6 ASCII chars, each in the range [0x30..0x39]
        bytes6 dateBytes = bytes6(bytes32(encoded << (256 - 48)));
        // Explanation for the shift:
        // 6 chars * 8 bits = 48 bits total. We shift left so the leftmost 6 bytes end up in dateBytes.
        // Another simpler approach is to directly cast:
        // dateBytes = bytes6(encoded) would assume `encoded` fits in 6 bytes.
        // If encoded always fits within 6 bytes, you can just do `bytes6 dateBytes = bytes6(encoded);`

        // To be safe with arbitrary input, let's mask:
        dateBytes = bytes6(uint48(encoded)); // since we know it's only 6 bytes of data.

        // Extract characters
        // "YYMMDD" -> dateBytes[0..5]
        uint256 Y1 = uint256(uint8(dateBytes[0])) - 0x30;
        uint256 Y2 = uint256(uint8(dateBytes[1])) - 0x30;
        uint256 M1 = uint256(uint8(dateBytes[2])) - 0x30;
        uint256 M2 = uint256(uint8(dateBytes[3])) - 0x30;
        uint256 D1 = uint256(uint8(dateBytes[4])) - 0x30;
        uint256 D2 = uint256(uint8(dateBytes[5])) - 0x30;

        // If all are zero ("000000"), return 0 as no date
        if (Y1 == 0 && Y2 == 0 && M1 == 0 && M2 == 0 && D1 == 0 && D2 == 0) {
            return 0;
        }

        uint256 yy = Y1 * 10 + Y2; // e.g. "23" for 2023
        uint256 mm = M1 * 10 + M2; // month
        uint256 dd = D1 * 10 + D2; // day

        // Determine the full year
        uint256 year = yy < 70 ? (2000 + yy) : (1900 + yy);

        // Calculate days since 1970
        uint256 totalDays = daysFrom1970(year, mm, dd);
        uint256 timestamp = totalDays * SECONDS_PER_DAY;

        return timestamp;
    }
}
