import { PartialType } from '@nestjs/swagger';

import { ContractCreateDto } from './ContractCreateDto';

export class ContractUpdateDto extends PartialType(ContractCreateDto) {}
