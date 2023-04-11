import { BnbSettingsDto } from 'src/modules/bnb/dto/BnbSettingsDto';

const settings = new BnbSettingsDto();
settings.txConfirmationBlocks = 5;
settings.txConfirmationTimeoutMs = 60_000;

export { settings };
