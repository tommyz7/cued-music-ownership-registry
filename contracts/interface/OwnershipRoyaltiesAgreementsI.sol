pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";


interface OwnershipRoyaltiesAgreementsI {
    function hasRole(address _operator, string _role) external view returns (bool);
    function balanceOfOwnership(address owner) external view returns (uint256);
}
