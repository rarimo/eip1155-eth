// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DateDecoder} from "../libs/DateDecoder.sol";

contract DateDecoderMock {
    function isLeapYearGasTrack(uint256 year) public returns (bool) {
        return DateDecoder.isLeapYear(year);
    }

    function isLeapYear(uint256 year) public pure returns (bool) {
        return DateDecoder.isLeapYear(year);
    }

    function daysInMonthGasTrack(uint256 year, uint256 month) public returns (uint256) {
        return DateDecoder.daysInMonth(year, month);
    }

    function daysInMonth(uint256 year, uint256 month) public pure returns (uint256) {
        return DateDecoder.daysInMonth(year, month);
    }

    function daysFrom1970GasTrack(
        uint256 year,
        uint256 month,
        uint256 day
    ) public returns (uint256) {
        return DateDecoder.daysFrom1970(year, month, day);
    }

    function daysFrom1970(uint256 year, uint256 month, uint256 day) public pure returns (uint256) {
        return DateDecoder.daysFrom1970(year, month, day);
    }

    function decodeDateGasTrack(uint256 encodedDate) public returns (uint256) {
        return DateDecoder.decodeDate(encodedDate);
    }

    function decodeDate(uint256 encodedDate) public pure returns (uint256) {
        return DateDecoder.decodeDate(encodedDate);
    }
}
