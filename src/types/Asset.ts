import { Contract } from 'web3-eth-contract';
import { Chain, SwapDirection, Token } from './types';

export interface FungibleToken {
  // native decimals
  decimals: number;
  // decimals for the wrapped version of this token
  wrappedDecimals: number;
}

export interface NonFungibleToken {
  ethId: string;
  subId?: string
}

export enum AssetType {
  ERC20 = 0,
  ERC721 = 1,
}

export interface Asset {
  // the chain for the native asset
  chain: Chain;
  // full native asset name
  name: string;
  // wrapped asset name - for opposite chain
  wrappedName: string;
  // native token symbol
  symbol: string;
  // wrapped token symbol - for opposite chain
  wrappedSymbol: string;
  token: FungibleToken | NonFungibleToken;
  // address for contract on ethereum
  address: string;
  // deployed ethereum chain ID
  chainId: number;
  // token logo
  logoUri: string;
  // web3 contract instance
  // this will be undefined for Ether
  contract?: Contract;
  // asset balances for each chain
  balance: {
    // eth: string,
    // polkadot: string
    [chain in Chain]: string
  },
  type: AssetType;
}

export function isErc20(asset: Asset): boolean {
  return asset.type === AssetType.ERC20
    && asset.address.length === 42
    && asset.chain === Chain.ETHEREUM;
}

export function isEther(asset: Asset): boolean {
  return !isErc20(asset)
    && asset.chain === Chain.ETHEREUM
    && asset.address === '0x0';
}

export function isDot(asset: Asset): boolean {
  return asset.chain === Chain.POLKADOT
    && !isErc20(asset)
    && !isEther(asset);
}

export function isNonFungible(asset: Asset): boolean {
  return ('ethId' in asset.token || 'subId' in asset.token);
}

function ethSymbols(
  asset: Asset,
  swapDirection: SwapDirection,
): { to: string, from: string } {
  if (swapDirection === SwapDirection.EthereumToPolkadot) {
    return {
      to: asset.wrappedSymbol,
      from: asset.symbol,
    };
  }
  return {
    from: asset.wrappedSymbol,
    to: asset.symbol,
  };
}

function polkadotSymbols(
  asset: Asset,
  swapDirection: SwapDirection,
): { to: string, from: string } {
  if (!asset) {
    return { to: '', from: '' };
  }

  if (swapDirection === SwapDirection.PolkadotToEthereum) {
    return {
      to: asset.wrappedSymbol,
      from: asset.symbol,
    };
  }
  return {
    from: asset.wrappedSymbol,
    to: asset.symbol,
  };
}

// returns the symbol for each corresponding chain based on the swap direction
export function symbols(asset: Asset, swapDirection: SwapDirection): { to: string, from: string } {
  let result = polkadotSymbols(asset, swapDirection);

  if (!isDot(asset)) {
    result = ethSymbols(asset, swapDirection);
  }

  return result;
}

function polkadotDecimals(
  asset: Asset,
  swapDirection: SwapDirection,
): { to: number, from: number } {
  const { decimals, wrappedDecimals } = (asset.token as FungibleToken);
  let result = { to: decimals, from: wrappedDecimals };
  if (swapDirection === SwapDirection.PolkadotToEthereum) {
    result = { to: wrappedDecimals, from: decimals };
  }
  return result;
}

function ethDecimals(
  asset: Asset,
  swapDirection: SwapDirection,
): { to: number, from: number } {
  const { decimals, wrappedDecimals } = (asset.token as FungibleToken);
  let result = { to: decimals, from: wrappedDecimals };
  if (swapDirection === SwapDirection.EthereumToPolkadot) {
    result = { to: wrappedDecimals, from: decimals };
  }
  return result;
}

// returns the decimals for each corresponding chain based on the swap direction
export function decimals(asset: Asset | undefined, swapDirection: SwapDirection): { to: number, from: number } {
  if (!asset) {
    return { to: 0, from: 0 };
  }
  let result = ethDecimals(asset, swapDirection);
  if (isDot(asset)) {
    result = polkadotDecimals(asset, swapDirection);
  }

  return result;
}

// Asset factory function
export function createFungibleAsset(
  token: Token,
  chain: Chain,
  wrappedDecimals: number,
  contract?: Contract,
): Asset {
  return {
    name: token.name,
    symbol: token.symbol,
    wrappedSymbol: `${token.symbol}`,
    wrappedName: `${token.name}`,
    contract,
    address: token.address,
    chain,
    balance: {
      eth: '0',
      polkadot: '0',
    },
    chainId: token.chainId,
    token: {
      decimals: token.decimals,
      wrappedDecimals,
    },
    logoUri: token.logoURI,
    type: AssetType.ERC20,
  };
}

interface Props {
  contract: Contract,
  chain: Chain,
  ethId: string,
  subId?: string,
  _name?: string,
  _symbol?: string,
  chainId?: number,
  logoUri?: string,
}

export async function createNonFungibleAsset(
  {
    contract,
    chain,
    ethId,
    subId,
    _name,
    _symbol,
    chainId = 15,
    logoUri = '',
  }: Props,
): Promise<Asset> {
  const name = _name || await contract.methods.name().call();
  const symbol = _symbol || await contract.methods.symbol().call();
  return {
    name,
    symbol,
    wrappedSymbol: `${symbol}`,
    wrappedName: `${name}`,
    contract,
    address: contract.options.address,
    chain,
    balance: {
      eth: '0',
      polkadot: '0',
    },
    chainId,
    token: {
      ethId,
      subId,
    },
    logoUri,
    type: AssetType.ERC721,
  };
}
