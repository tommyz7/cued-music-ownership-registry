pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";


interface ProxyFactoryI {
    function deploy(address _admin, bytes _data) external returns (address);
}
