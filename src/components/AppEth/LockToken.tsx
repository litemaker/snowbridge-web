// Copyright 2017-2020 @polkadot/apps-routing authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

// General
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Contract } from 'web3-eth-contract';

// External
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Grid,
  FormControl,
  FormHelperText,
} from '@material-ui/core';

// Local
import PolkadotAccount from '../PolkadotAccount';
import Net from '../../net';
import { Token } from '../../types';

type LockTokenProps = {
  net: Net;
  selectedToken: Token;
  currentTokenAllowance?: Number;
};

// ------------------------------------------
//           LockToken component
// ------------------------------------------
function LockToken({
  net,
  selectedToken,
  currentTokenAllowance
}: LockTokenProps): React.ReactElement {
  const [depositAmount, setDepositAmount] = useState<Number | null>(null);

  const handleLockToken = async () => {
    await net?.eth?.lock_token(`${depositAmount}`, selectedToken);
  };

  const isERC20 = selectedToken.address !== '0x0';

  // Render
  return (
    <Box display="flex" flexDirection="column">
      <Grid item xs={10}>
        <FormControl>
          <PolkadotAccount address={net.polkadotAddress} />
        </FormControl>
        <FormHelperText id="ethAmountDesc">
          Polkadot Receiving Address
          </FormHelperText>
      </Grid>
      <Box padding={1} />
      <FormControl>
        <Typography gutterBottom>Amount</Typography>
        <TextField
          InputProps={{
            value: depositAmount,
          }}
          id="token-input-amount"
          type="number"
          margin="normal"
          onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : null)}
          placeholder={`0.00 ${selectedToken.symbol}`}
          style={{ margin: 5 }}
          variant="outlined"
        />
        <FormHelperText id="ethAmountDesc">
          How much {selectedToken.symbol} would you like to deposit?
            </FormHelperText>
      </FormControl>
      <Box alignItems="center" display="flex" justifyContent="space-around">
        {isERC20 && <Box>
          <Typography>
            Current {selectedToken.symbol} allowance for bridge: {Number(currentTokenAllowance).toFixed(18)} {selectedToken.symbol}
          </Typography>
        </Box>}
        <Box
          alignItems="center"
          display="flex"
          height="100px"
          paddingBottom={1}
          paddingTop={2}
          width="300px"
        >
          <Button
            color="primary"
            disabled={currentTokenAllowance === 0}
            fullWidth={true}
            onClick={() => handleLockToken()}
            variant="outlined"
          >
            <Typography variant="button">Send</Typography>
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default styled(LockToken)`
`;
