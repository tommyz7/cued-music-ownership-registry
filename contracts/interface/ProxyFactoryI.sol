pragma solidity >=0.5.0 <0.6.0;
pragma experimental "ABIEncoderV2";


interface ProxyFactoryI {
    function deploy(address _admin, bytes calldata _data) external returns (address);
}
