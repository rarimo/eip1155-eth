// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library DateDecoder {
    uint256 internal constant SECONDS_PER_DAY = 24 hours;

    function isLeapYear(uint256 year_) internal pure returns (bool condition_) {
        // solhint-disable-next-line no-inline-assembly
        assembly ("memory-safe") {
            let mod400 := mod(year_, 400)
            let mod4 := mod(year_, 4)
            let mod100 := mod(year_, 100)

            // ((year % 400 == 0) || ((year % 4 == 0) && (year % 100 != 0)))
            condition_ := or(eq(mod400, 0), and(eq(mod4, 0), iszero(eq(mod100, 0))))
        }
    }

    function daysInMonth(uint256 year_, uint256 month_) internal pure returns (uint256 daysIn_) {
        // solhint-disable-next-line no-inline-assembly
        assembly ("memory-safe") {
            switch month_
            case 1 {
                daysIn_ := 31
            }
            case 2 {
                let mod400 := mod(year_, 400)
                let mod4 := mod(year_, 4)
                let mod100 := mod(year_, 100)
                let leap := or(eq(mod400, 0), and(eq(mod4, 0), iszero(eq(mod100, 0))))

                // If leap = 1 -> 29, else 28
                daysIn_ := add(28, leap)
            }
            case 3 {
                daysIn_ := 31
            }
            case 4 {
                daysIn_ := 30
            }
            case 5 {
                daysIn_ := 31
            }
            case 6 {
                daysIn_ := 30
            }
            case 7 {
                daysIn_ := 31
            }
            case 8 {
                daysIn_ := 31
            }
            case 9 {
                daysIn_ := 30
            }
            case 10 {
                daysIn_ := 31
            }
            case 11 {
                daysIn_ := 30
            }
            case 12 {
                daysIn_ := 31
            }
            default {
                revert(0, 0)
            }
        }
    }

    function daysFrom1970(
        uint256 year_,
        uint256 month_,
        uint256 day_
    ) internal pure returns (uint256) {
        require(year_ >= 1970, "DD: Year must be 1970 or later");

        // Calculate total days from 1970-01-01 to the given date
        uint256 daysCount_ = 0;

        for (uint256 y = 1970; y < year_; ++y) {
            daysCount_ += isLeapYear(y) ? 366 : 365;
        }

        for (uint256 m = 1; m < month_; ++m) {
            daysCount_ += daysInMonth(year_, m);
        }

        // Add days of current month (day - 1 since we start counting from zero)
        daysCount_ += (day_ - 1);

        return daysCount_;
    }

    function decodeDate(uint256 encoded_) internal pure returns (uint256) {
        require(encoded_ >= 0x303030303030 && encoded_ <= 0x393939393939, "DD: Invalid input");

        // Convert the uint256 into a 6-byte ASCII sequence
        // The encoding produces 6 ASCII chars, each in the range [0x30..0x39]
        bytes6 dateBytes_ = bytes6(bytes32(encoded_ << (256 - 48)));
        dateBytes_ = bytes6(uint48(encoded_)); // since we know it's only 6 bytes of data.

        // Extract characters
        // "YYMMDD" -> dateBytes[0..5]
        uint256 Y1_ = uint256(uint8(dateBytes_[0])) - 0x30;
        uint256 Y2_ = uint256(uint8(dateBytes_[1])) - 0x30;
        uint256 M1_ = uint256(uint8(dateBytes_[2])) - 0x30;
        uint256 M2_ = uint256(uint8(dateBytes_[3])) - 0x30;
        uint256 D1_ = uint256(uint8(dateBytes_[4])) - 0x30;
        uint256 D2_ = uint256(uint8(dateBytes_[5])) - 0x30;

        // If all are zero ("000000"), return 0 as no date
        if (Y1_ == 0 && Y2_ == 0 && M1_ == 0 && M2_ == 0 && D1_ == 0 && D2_ == 0) {
            return 0;
        }

        uint256 yy_ = Y1_ * 10 + Y2_;
        uint256 mm_ = M1_ * 10 + M2_;
        uint256 dd_ = D1_ * 10 + D2_;

        // Determine the full year
        uint256 year_ = yy_ < 70 ? (2000 + yy_) : (1900 + yy_);
        uint256 totalDays_ = daysFrom1970(year_, mm_, dd_);

        return totalDays_ * SECONDS_PER_DAY;
    }
}
