import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { GetCompaniesFilterDto } from './dto/get-companies-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, CompanyStatus } from 'database';
import { IsEnum } from 'class-validator';

class UpdateCompanyStatusDto {
  @ApiProperty({ enum: CompanyStatus, description: 'Target activation status' })
  @IsEnum(CompanyStatus)
  status: CompanyStatus;
}

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Create a new company',
    description: 'Registers a new partner company with profile and contact information (Super Admin / BD Team only).',
  })
  @ApiResponse({ status: 201, description: 'The company has been successfully created.' })
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.createCompany(createCompanyDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Get a list of all companies',
    description: 'Returns a paginated list of companies with optional search and status filtering (Super Admin / BD Team only).',
  })
  async findAll(@Query() filter: GetCompaniesFilterDto) {
    return this.companiesService.getCompaniesList(filter);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Get company details by ID',
    description: 'Retrieves complete company profile, teams, and member statistics by company UUID.',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.getCompanyDetails(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Update company details',
    description: 'Updates company name, domain, address, or contact details (Super Admin / BD Team only).',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateCompany(id, updateCompanyDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update company status',
    description: 'Activates or suspends a partner company (Super Admin only).',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCompanyStatusDto,
  ) {
    return this.companiesService.updateStatus(id, body.status);
  }
}
