import React from 'react';
import styled from 'styled-components';

type Props = {
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: any;
  type?: string;

}

const Input = ({ className, disabled, placeholder, value, onChange, type, children }: React.PropsWithChildren<Props>) => {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      type={type}
      disabled={disabled}
      className={className}>
      {children}
    </input>
  );
};

export default styled(Input)`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 10px;
  text-align: right;
  height: 24px;

  background: ${props => props.theme.colors.transferPanelBackground};

  border: 1px solid ${props => props.theme.colors.main};
  border-radius:  ${props => props.theme.borderRadius};

  font-family: Menlo;
  font-style: normal;
  font-weight: normal;
  font-size: 18px;
  line-height: 100%;
  letter-spacing: -0.04em;

  color: ${props => props.theme.colors.secondary};
`;
