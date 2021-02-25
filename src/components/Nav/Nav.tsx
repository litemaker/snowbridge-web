import React, { useState } from 'react';
import * as S from './Nav.style';
import Net from '../../net';

import { shortenWalletAddress } from '../../utils/common';

import Modal from '../Modal';
import TransactionsList from '../TransactionsList/';

import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';

import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import { TransactionsState } from '../../redux/reducers/transactions';
import { BLOCK_EXPLORER_URL } from '../../config';

type Props = {
  net: Net;
  transactions: TransactionsState;
};

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    formControl: {
      margin: theme.spacing(1),
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
  }),
);

function Nav({ net, transactions }: Props): React.ReactElement<Props> {
  const classes = useStyles();

  const [polkadotAccIndex, setPolkadotAccIndex] = useState(0);

  const [isOpen, setIsOpen] = useState(false);

  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setPolkadotAccIndex(event.target.value as number);
  };

  const polkadotAccs = [{ address: '123' }, { address: '345' }];

  return (
    <S.Wrapper>
      <S.Heading>Snowbridge</S.Heading>
      <S.CurrencyList>
        <S.DisplayWrapper>
          <S.DisplayTitle>Ethereum Wallet</S.DisplayTitle>
          <S.DisplayContainer>
            <S.Amount>{net.ethBalance} ETH</S.Amount>
            <S.Address
              as="a"
              href={`${BLOCK_EXPLORER_URL}/address/${net.ethAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortenWalletAddress(net.ethAddress)}
            </S.Address>
          </S.DisplayContainer>
        </S.DisplayWrapper>
        <S.DisplayWrapper>
          <S.DisplayTitle>Polkadot Wallet</S.DisplayTitle>
          <S.DisplayContainer>
            <S.Amount>{net.parachainTokenBalance?.toString()}</S.Amount>
            <S.Address onClick={openModal}>
              {polkadotAccs.length > 0 &&
                shortenWalletAddress(net.polkadotAddress!)}
            </S.Address>
          </S.DisplayContainer>
          {isOpen && polkadotAccs.length > 0 && (
            <Modal isOpen={isOpen} closeModal={closeModal} buttonText="Close">
              <S.ModalContainer>
                <S.ModalHeader>
                  <S.ModalTitle>Account</S.ModalTitle>
                  <div>X</div>
                </S.ModalHeader>

                <FormControl className={classes.formControl}>
                  <InputLabel id="polkadot-js-addresses">
                    Select Account:
                  </InputLabel>
                  <Select
                    labelId="polkadot-js-addresses"
                    id="polkadot-js-addressess-select"
                    value={polkadotAccIndex}
                    onChange={handleChange}
                  >
                    {polkadotAccs.map((acc, index) => (
                      <MenuItem value={index} key={index}>
                        {shortenWalletAddress(acc.address)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </S.ModalContainer>
            </Modal>
          )}
        </S.DisplayWrapper>
        <TransactionsList transactions={transactions} />
      </S.CurrencyList>
    </S.Wrapper>
  );
}

export default Nav;
