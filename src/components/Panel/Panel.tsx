import React from 'react';
import styled from 'styled-components';

type Props = {
  className?: string;
}

const Panel = ({ className, children }: React.PropsWithChildren<Props>) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

export default styled(Panel)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  overflow-y: auto;

  box-sizing: border-box;
  box-shadow: ${props => props.theme.boxShadow};
  border-radius: ${props => props.theme.borderRadius};
  border: 1px solid ${props => props.theme.colors.panelBorder};
  background: ${props => props.theme.colors.panelBackground};

  color: ${props => props.theme.colors.secondary};

  padding: 20px;

  width: 100%;
`;
