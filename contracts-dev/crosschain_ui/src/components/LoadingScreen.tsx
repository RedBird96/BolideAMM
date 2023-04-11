import React from "react";
import styled from "styled-components";
import {Loader} from "@progress/kendo-react-indicators";

const LoadingMask = styled.div`
  background-color: #f4f6f8;
  opacity: 0.5;
  position: fixed;
  z-index:10005;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0; 
`;

const LoadingContainer =  styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
`;

const LoadingScreen = () => {

  return (
    <LoadingMask>
      <LoadingContainer>
        <Loader type="infinite-spinner"></Loader>
      </LoadingContainer>
    </LoadingMask>
  );
}

export default LoadingScreen;
