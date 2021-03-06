import React from 'react';
import styled from 'styled-components';
import LoadingSpinner from '../../../../LoadingSpinner';
import ToolTip from '../../../../ToolTip/ToolTip';

const CIRCLE_SIZE = 20;

type StyledProps = {
  status: StepStatus;
};

export enum StepStatus {
  PENDING,
  HOVERING,
  LOADING,
  COMPLETE,
  ERROR,
}

const Wrapper = styled.div<StyledProps>`
  border-radius: 50%;
  border: 1px solid ${(props) => props.theme.colors.secondary};
  width: ${CIRCLE_SIZE}px;
  height: ${CIRCLE_SIZE}px;
  box-sizing: border-box;
  background-color: ${(props) => {
    switch (props.status) {
      case StepStatus.COMPLETE:
        return props.theme.colors.stepComplete;
      case StepStatus.ERROR:
        return props.theme.colors.stepError;
      default:
        return 'transparent';
    }
  }};
`;

const Link = styled.a`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;


type Props = {
  children?: object | string | null;
  link?: string;
  toolTip: string;
  subtext?: string;
  status: StepStatus;
  className?: string;
};

function Step({
  className,
  link,
  toolTip,
  subtext,
  status
}: Props): React.ReactElement<Props> {
  return (
    <Wrapper className={className} status={status}>
      <ToolTip className='step-tooltip' text={toolTip} />
      <Link
        href={link}
        target="_blank"
      >
        {status === StepStatus.LOADING ? <LoadingSpinner spinnerWidth='10px' spinnerHeight='10px' micro={true} /> : undefined}
      </Link>
      <div className='step-subtext-container'>
        <div className='step-subtext'>{subtext}</div>
      </div>
    </Wrapper>
  );
}

export default styled(Step)`
  position: relative;

  .step-tooltip {
    position: absolute;
    top: -17px;
    right: -12px;
  }

  .step-subtext-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 5px;
    position: relative;
  }

  .step-subtext {
    font-size: 10px;
    text-align: center;
    top: 0px;
    position: absolute;
    width: 300px;
  }
`;
